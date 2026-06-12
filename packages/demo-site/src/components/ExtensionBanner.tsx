import React from 'react';
import type { Capabilities } from '@byomsdk/sdk';

const INSTALL_URL =
  'https://chromewebstore.google.com/detail/byom-wallet/jnpajlpoemfgehchogeboncaikdoggdd';

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
        <span>
          Extension not detected.{' '}
          <a href={INSTALL_URL} target="_blank" rel="noreferrer">
            Install BYOM Wallet from Chrome Web Store
          </a>{' '}
          and reload this page.
        </span>
      )}
    </div>
  );
};
