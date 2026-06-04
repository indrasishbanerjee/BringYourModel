/**
 * Error codes for byom protocol
 * These are serialized across the wire and reconstructed on the receiving side
 */
export var ErrorCode;
(function (ErrorCode) {
    // SDK/Extension availability
    ErrorCode["EXTENSION_NOT_INSTALLED"] = "EXTENSION_NOT_INSTALLED";
    ErrorCode["EXTENSION_DISABLED"] = "EXTENSION_DISABLED";
    ErrorCode["PROTOCOL_VERSION_MISMATCH"] = "PROTOCOL_VERSION_MISMATCH";
    // Permission and policy
    ErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    ErrorCode["SITE_NOT_APPROVED"] = "SITE_NOT_APPROVED";
    ErrorCode["BUDGET_EXCEEDED"] = "BUDGET_EXCEEDED";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorCode["TASK_NOT_ALLOWED"] = "TASK_NOT_ALLOWED";
    ErrorCode["MODEL_NOT_ALLOWED"] = "MODEL_NOT_ALLOWED";
    // Provider issues
    ErrorCode["PROVIDER_UNAVAILABLE"] = "PROVIDER_UNAVAILABLE";
    ErrorCode["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    ErrorCode["INVALID_API_KEY"] = "INVALID_API_KEY";
    ErrorCode["QUOTA_EXHAUSTED"] = "QUOTA_EXHAUSTED";
    // Request/validation issues
    ErrorCode["INVALID_REQUEST"] = "INVALID_REQUEST";
    ErrorCode["SCHEMA_VALIDATION_FAILED"] = "SCHEMA_VALIDATION_FAILED";
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ErrorCode["ABORTED"] = "ABORTED";
    // Internal
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["VAULT_LOCKED"] = "VAULT_LOCKED";
})(ErrorCode || (ErrorCode = {}));
/**
 * Base error class for byom SDK
 */
export class ByomError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = 'ByomError';
        this.code = code;
        this.details = details;
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }
    static fromJSON(data) {
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
    constructor(message = 'Permission denied', details) {
        super(ErrorCode.PERMISSION_DENIED, message, details);
        this.name = 'PermissionDeniedError';
    }
}
export class BudgetExceededError extends ByomError {
    constructor(message = 'Budget exceeded', details) {
        super(ErrorCode.BUDGET_EXCEEDED, message, details);
        this.name = 'BudgetExceededError';
    }
}
export class ProviderUnavailableError extends ByomError {
    constructor(message = 'Provider unavailable', details) {
        super(ErrorCode.PROVIDER_UNAVAILABLE, message, details);
        this.name = 'ProviderUnavailableError';
    }
}
//# sourceMappingURL=errors.js.map