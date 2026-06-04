/**
 * Protocol version for wire compatibility between byom SDK and extension.
 * Format: major.minor.patch
 * - Major: Breaking changes requiring both sides to update
 * - Minor: Backwards compatible additions
 * - Patch: Bug fixes, no wire changes
 */
export declare const PROTOCOL_VERSION: "1.0.0";
/**
 * Extract major version for handshake validation
 */
export declare function getProtocolMajor(): number;
/**
 * Check if two protocol versions are compatible
 * Major versions must match exactly
 */
export declare function isProtocolCompatible(version: string): boolean;
//# sourceMappingURL=version.d.ts.map