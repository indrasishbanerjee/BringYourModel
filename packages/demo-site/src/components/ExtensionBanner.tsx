import React from 'react';
import type { Capabilities } from '@byomsdk/sdk';

interface ExtensionBannerProps {
  isAvailable: boolean | null;
  capabilities: Capabilities | null;
}

export const ExtensionBanner: React.FC<ExtensionBannerProps> = ({
  isAvailable,
  capabilities,
}) => {
  const className =
    isAvailable === null
      ? 'banner banner--checking'
      : isAvailable
        ? 'banner banner--ok'
        : 'banner banner--error';

  return (
    <div className={className} data-testid="extension-banner">
      {isAvailable === null && <span>Checking extension…</span>}
      {isAvailable === true && (
        <span>Extension detected{capabilities ? ` (v${capabilities.extensionVersion})` : ''}</span>
      )}
      {isAvailable === false && (
        <span>Extension not detected. Install the Bring Your Model extension and reload.</span>
      )}
    </div>
  );
};
