/**
 * Error codes for byom protocol
 * These are serialized across the wire and reconstructed on the receiving side
 */
export enum ErrorCode {
  // SDK/Extension availability
  EXTENSION_NOT_INSTALLED = 'EXTENSION_NOT_INSTALLED',
  EXTENSION_DISABLED = 'EXTENSION_DISABLED',
  PROTOCOL_VERSION_MISMATCH = 'PROTOCOL_VERSION_MISMATCH',
  
  // Permission and policy
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SITE_NOT_APPROVED = 'SITE_NOT_APPROVED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
  TASK_NOT_ALLOWED = 'TASK_NOT_ALLOWED',
  MODEL_NOT_ALLOWED = 'MODEL_NOT_ALLOWED',
  
  // Provider issues
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INVALID_API_KEY = 'INVALID_API_KEY',
  QUOTA_EXHAUSTED = 'QUOTA_EXHAUSTED',
  
  // Request/validation issues
  INVALID_REQUEST = 'INVALID_REQUEST',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  ABORTED = 'ABORTED',
  
  // Internal
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VAULT_LOCKED = 'VAULT_LOCKED',
}

/**
 * Serializable error structure for wire transfer
 */
export interface SerializedError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Base error class for byom SDK
 */
export class ByomError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ByomError';
    this.code = code;
    this.details = details;
  }

  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  static fromJSON(data: SerializedError): ByomError {
    return new ByomError(data.code, data.message, data.details);
  }
}

// Specific error classes for type safety
export class ExtensionNotInstalledError extends ByomError {
  constructor(message = 'Bring Your Model extension is not installed') {
    super(ErrorCode.EXTENSION_NOT_INSTALLED, message);
    this.name = 'ExtensionNotInstalledError';
  }
}

export class PermissionDeniedError extends ByomError {
  constructor(
    message = 'Permission denied',
    details?: { origin?: string; reason?: string }
  ) {
    super(ErrorCode.PERMISSION_DENIED, message, details);
    this.name = 'PermissionDeniedError';
  }
}

export class BudgetExceededError extends ByomError {
  constructor(
    message = 'Budget exceeded',
    details?: { budgetType?: string; current?: number; limit?: number }
  ) {
    super(ErrorCode.BUDGET_EXCEEDED, message, details);
    this.name = 'BudgetExceededError';
  }
}

export class ProviderUnavailableError extends ByomError {
  constructor(
    message = 'Provider unavailable',
    details?: { provider?: string; reason?: string }
  ) {
    super(ErrorCode.PROVIDER_UNAVAILABLE, message, details);
    this.name = 'ProviderUnavailableError';
  }
}