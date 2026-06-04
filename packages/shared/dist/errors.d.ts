/**
 * Error codes for byom protocol
 * These are serialized across the wire and reconstructed on the receiving side
 */
export declare enum ErrorCode {
    EXTENSION_NOT_INSTALLED = "EXTENSION_NOT_INSTALLED",
    EXTENSION_DISABLED = "EXTENSION_DISABLED",
    PROTOCOL_VERSION_MISMATCH = "PROTOCOL_VERSION_MISMATCH",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    SITE_NOT_APPROVED = "SITE_NOT_APPROVED",
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
    RATE_LIMITED = "RATE_LIMITED",
    TASK_NOT_ALLOWED = "TASK_NOT_ALLOWED",
    MODEL_NOT_ALLOWED = "MODEL_NOT_ALLOWED",
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    INVALID_API_KEY = "INVALID_API_KEY",
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED",
    INVALID_REQUEST = "INVALID_REQUEST",
    SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",
    TIMEOUT = "TIMEOUT",
    ABORTED = "ABORTED",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    VAULT_LOCKED = "VAULT_LOCKED"
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
export declare class ByomError extends Error {
    readonly code: ErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: ErrorCode, message: string, details?: Record<string, unknown>);
    toJSON(): SerializedError;
    static fromJSON(data: SerializedError): ByomError;
}
export declare class ExtensionNotInstalledError extends ByomError {
    constructor(message?: string);
}
export declare class PermissionDeniedError extends ByomError {
    constructor(message?: string, details?: {
        origin?: string;
        reason?: string;
    });
}
export declare class BudgetExceededError extends ByomError {
    constructor(message?: string, details?: {
        budgetType?: string;
        current?: number;
        limit?: number;
    });
}
export declare class ProviderUnavailableError extends ByomError {
    constructor(message?: string, details?: {
        provider?: string;
        reason?: string;
    });
}
//# sourceMappingURL=errors.d.ts.map