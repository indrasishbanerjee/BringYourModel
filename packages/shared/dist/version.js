/**
 * Protocol version for wire compatibility between byom SDK and extension.
 * Format: major.minor.patch
 * - Major: Breaking changes requiring both sides to update
 * - Minor: Backwards compatible additions
 * - Patch: Bug fixes, no wire changes
 */
export const PROTOCOL_VERSION = '1.0.0';
/**
 * Extract major version for handshake validation
 */
export function getProtocolMajor() {
    return parseInt(PROTOCOL_VERSION.split('.')[0], 10);
}
/**
 * Check if two protocol versions are compatible
 * Major versions must match exactly
 */
export function isProtocolCompatible(version) {
    const major = parseInt(version.split('.')[0], 10);
    return major === getProtocolMajor();
}
//# sourceMappingURL=version.js.map