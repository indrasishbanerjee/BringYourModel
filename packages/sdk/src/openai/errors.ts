import { ByomError, ErrorCode } from '../protocol.js';

export class APIError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'APIError';
    this.status = options?.status;
    this.code = options?.code;
  }
}

export class APIConnectionError extends APIError {
  constructor(message = 'Connection error.') {
    super(message, { code: 'connection_error' });
    this.name = 'APIConnectionError';
  }
}

export class APIConnectionTimeoutError extends APIConnectionError {
  constructor(message = 'Request timed out.') {
    super(message);
    this.name = 'APIConnectionTimeoutError';
  }
}

export class APIUserAbortError extends APIError {
  constructor(message = 'Request aborted.') {
    super(message, { code: 'abort' });
    this.name = 'APIUserAbortError';
  }
}

export class BadRequestError extends APIError {
  constructor(message: string) {
    super(message, { status: 400, code: 'bad_request' });
    this.name = 'BadRequestError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string) {
    super(message, { status: 401, code: 'authentication_error' });
    this.name = 'AuthenticationError';
  }
}

export class PermissionDeniedError extends APIError {
  constructor(message: string) {
    super(message, { status: 403, code: 'permission_denied' });
    this.name = 'PermissionDeniedError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string) {
    super(message, { status: 429, code: 'rate_limit_exceeded' });
    this.name = 'RateLimitError';
  }
}

export class BYOMExtensionUnavailableError extends APIConnectionError {
  constructor(message = 'Bring Your Model extension is not available.') {
    super(message);
    this.name = 'BYOMExtensionUnavailableError';
  }
}

export class BYOMBudgetExceededError extends RateLimitError {
  constructor(message = 'BYOM budget exceeded for this site.') {
    super(message);
    this.name = 'BYOMBudgetExceededError';
  }
}

export function mapCompatError(error: unknown): Error {
  if (error instanceof APIError) {
    return error;
  }

  if (error instanceof ByomError) {
    switch (error.code) {
      case ErrorCode.EXTENSION_NOT_INSTALLED:
      case ErrorCode.EXTENSION_DISABLED:
      case ErrorCode.PROTOCOL_VERSION_MISMATCH:
        return new BYOMExtensionUnavailableError(error.message);
      case ErrorCode.PERMISSION_DENIED:
      case ErrorCode.SITE_NOT_APPROVED:
        return new PermissionDeniedError(error.message);
      case ErrorCode.BUDGET_EXCEEDED:
        return new BYOMBudgetExceededError(error.message);
      case ErrorCode.RATE_LIMITED:
        return new RateLimitError(error.message);
      case ErrorCode.INVALID_API_KEY:
        return new AuthenticationError(error.message);
      case ErrorCode.SCHEMA_VALIDATION_FAILED:
      case ErrorCode.INVALID_REQUEST:
        return new BadRequestError(error.message);
      case ErrorCode.TIMEOUT:
        return new APIConnectionTimeoutError(error.message);
      case ErrorCode.ABORTED:
        return new APIUserAbortError(error.message);
      default:
        return new APIError(error.message, { code: error.code });
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new APIError(String(error));
}
