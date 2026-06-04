import {
  ErrorCode,
  type Grant,
  type TaskType,
  type AskRequest,
  type GlobalRoutingPreferences,
  type ProviderId,
} from '@byom/shared';
import { GrantStore } from '../../storage/grant-store';
import { estimateRequestCost, shouldShowBudgetWarning } from '../telemetry/pricing';

/**
 * Generic policy payload accepted for any task type
 */
export interface PolicyRequestPayload {
  model?: string;
  maxTokens?: number;
  input?: string;
  /** Chat turn text (chat task) */
  message?: string;
  task?: string;
  messages?: { role: string; content: string }[];
}

/**
 * Policy check result
 */
interface PolicyCheckResult {
  allowed: boolean;
  errorCode?: ErrorCode;
  errorMessage?: string;
  modelPreference?: string;
  /** True when daily spend is at or above 80% of budget */
  budgetWarning?: boolean;
}

const DEFAULT_PREFLIGHT_MODEL = 'gpt-4o-mini';

/**
 * PolicyEngine - Enforces usage policies and budgets
 */
export class PolicyEngine {
  /**
   * Check if a request is allowed based on grant policy
   * Uses GrantStore for authoritative usage tracking and proper pricing
   */
  async checkPolicy(
    grant: Grant,
    task: TaskType,
    request: PolicyRequestPayload | AskRequest,
    grantStore: GrantStore,
    globalPrefs?: GlobalRoutingPreferences,
    providerDefaultModel?: string
  ): Promise<PolicyCheckResult> {
    // Check if task is allowed
    if (!grant.allowedTasks.includes(task)) {
      return {
        allowed: false,
        errorCode: ErrorCode.TASK_NOT_ALLOWED,
        errorMessage: `Task '${task}' is not allowed for this site`,
      };
    }

    // Check if grant has expired
    if (grant.expiresAt && grant.expiresAt < Date.now()) {
      return {
        allowed: false,
        errorCode: ErrorCode.PERMISSION_DENIED,
        errorMessage: 'Site approval has expired',
      };
    }

    // Get current usage from GrantStore (authoritative)
    const { daily: dailySpend, monthly: monthlySpend } = await grantStore.getUsage(grant.origin);

    // Check daily budget
    if (dailySpend >= grant.dailyBudgetUSD) {
      return {
        allowed: false,
        errorCode: ErrorCode.BUDGET_EXCEEDED,
        errorMessage: `Daily budget of $${grant.dailyBudgetUSD} exceeded. Current spend: $${dailySpend.toFixed(2)}`,
      };
    }

    // Check monthly budget
    if (monthlySpend >= grant.monthlyBudgetUSD) {
      return {
        allowed: false,
        errorCode: ErrorCode.BUDGET_EXCEEDED,
        errorMessage: `Monthly budget of $${grant.monthlyBudgetUSD} exceeded. Current spend: $${monthlySpend.toFixed(2)}`,
      };
    }

    const budgetWarning = shouldShowBudgetWarning(dailySpend, grant.dailyBudgetUSD);
    if (budgetWarning) {
      console.log(
        `[PolicyEngine] Budget warning for ${grant.origin}: ${((dailySpend / grant.dailyBudgetUSD) * 100).toFixed(1)}% of daily budget used`
      );
    }

    const inputText = this.extractInputText(request);
    const preflightModel = this.resolvePreflightModel(
      request,
      globalPrefs,
      providerDefaultModel
    );
    const maxTokens = request.maxTokens || 1000;
    const { estimatedCost, estimatedInputTokens, estimatedOutputTokens } = estimateRequestCost(
      inputText,
      maxTokens,
      preflightModel
    );

    // Check if this request would exceed daily budget
    if (dailySpend + estimatedCost > grant.dailyBudgetUSD) {
      return {
        allowed: false,
        errorCode: ErrorCode.BUDGET_EXCEEDED,
        errorMessage: `This request ($${estimatedCost.toFixed(4)}) would exceed your daily budget ($${grant.dailyBudgetUSD})`,
      };
    }

    // Check per-request token cap
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
    if (estimatedTotalTokens > grant.perRequestTokenCap) {
      return {
        allowed: false,
        errorCode: ErrorCode.BUDGET_EXCEEDED,
        errorMessage: `Estimated token count (${estimatedTotalTokens}) exceeds per-request cap (${grant.perRequestTokenCap})`,
      };
    }

    // Check model allowlist
    if (grant.modelAllowlist && request.model) {
      const isAllowed = grant.modelAllowlist.some((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(request.model!);
        }
        return pattern === request.model;
      });

      if (!isAllowed) {
        return {
          allowed: false,
          errorCode: ErrorCode.MODEL_NOT_ALLOWED,
          errorMessage: `Model '${request.model}' is not in the allowed list`,
        };
      }
    }

    // Apply privacy mode routing (alias for provider selection)
    const modelPreference = this.applyPrivacyMode(grant.privacyMode, request);

    return {
      allowed: true,
      modelPreference,
      budgetWarning,
    };
  }

  /**
   * Extract input text from any task payload for cost estimation
   */
  extractInputText(request: PolicyRequestPayload | AskRequest): string {
    const parts: string[] = [];
    if (request.messages?.length) {
      parts.push(...request.messages.map((m) => m.content));
    }
    if (request.message) {
      parts.push(request.message);
    }
    if (request.input) {
      parts.push(request.input);
    }
    return parts.join('\n');
  }

  /**
   * Resolve model for preflight cost estimation
   */
  resolvePreflightModel(
    request: PolicyRequestPayload,
    globalPrefs?: GlobalRoutingPreferences,
    providerDefaultModel?: string
  ): string {
    return (
      request.model ||
      globalPrefs?.preferredModel ||
      providerDefaultModel ||
      DEFAULT_PREFLIGHT_MODEL
    );
  }

  /**
   * Apply privacy mode to select appropriate model alias
   */
  private applyPrivacyMode(
    privacyMode: Grant['privacyMode'],
    request: PolicyRequestPayload
  ): string | undefined {
    switch (privacyMode) {
      case 'local-only':
        return 'local';
      case 'preferred-local':
        if (request.task === 'summarize' && (request.input?.length ?? 0) < 1000) {
          return 'local';
        }
        return undefined;
      case 'cloud-allowed':
        return undefined;
      case 'per-task':
        if (request.task === 'summarize') {
          return 'fast';
        } else if (request.task === 'draft') {
          return 'reasoning';
        }
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Check if a high-cost request should require explicit approval
   */
  shouldRequireApproval(estimatedCost: number, grant: Grant): boolean {
    const threshold = grant.dailyBudgetUSD * 0.2;
    return estimatedCost > threshold;
  }

  /**
   * Get policy summary for display
   */
  getPolicySummary(grant: Grant): {
    dailyBudget: number;
    monthlyBudget: number;
    perRequestCap: number;
    privacyMode: string;
    autoApprove: boolean;
    expiresAt?: Date;
  } {
    return {
      dailyBudget: grant.dailyBudgetUSD,
      monthlyBudget: grant.monthlyBudgetUSD,
      perRequestCap: grant.perRequestTokenCap,
      privacyMode: grant.privacyMode,
      autoApprove: grant.autoApprove,
      expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : undefined,
    };
  }
}
