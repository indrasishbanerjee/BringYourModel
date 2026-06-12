import type { Capabilities } from './protocol.js';
import { getClient } from './client.js';

export const DEFAULT_CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/byom-wallet/jnpajlpoemfgehchogeboncaikdoggdd';

export const DEFAULT_GITHUB_RELEASES_URL =
  'https://github.com/indrasishbanerjee/BringYourModel/releases/latest';

/** @deprecated Use DEFAULT_CHROME_WEB_STORE_URL */
export const DEFAULT_INSTALL_URL = DEFAULT_CHROME_WEB_STORE_URL;

export const DEFAULT_DEMO_URL = 'https://bringyourmodel.com/demo/';

export const DEFAULT_DOCS_URL =
  'https://github.com/indrasishbanerjee/BringYourModel/blob/main/docs/sdk-api.md';

export interface InstallUrlOptions {
  githubReleasesUrl?: string;
  chromeWebStoreUrl?: string;
  demoUrl?: string;
  docsUrl?: string;
}

/**
 * URL for installing BYOM Wallet. Defaults to Chrome Web Store; pass githubReleasesUrl for manual zip installs.
 */
export function getInstallUrl(options: InstallUrlOptions = {}): string {
  if (options.githubReleasesUrl) {
    return options.githubReleasesUrl;
  }
  return options.chromeWebStoreUrl ?? DEFAULT_CHROME_WEB_STORE_URL;
}

export type RecommendedAction =
  | 'install-extension'
  | 'unlock-vault'
  | 'approve-site'
  | 'configure-provider'
  | 'ready';

export interface InstallPromptState {
  isAvailable: boolean;
  capabilities: Capabilities | null;
  installUrl: string;
  reloadAfterInstall: boolean;
  recommendedAction: RecommendedAction;
}

export interface InstallPromptOptions extends InstallUrlOptions {
  timeoutMs?: number;
}

/**
 * Inspect extension availability and suggest the next user action.
 */
export async function createInstallPromptState(
  options: InstallPromptOptions = {}
): Promise<InstallPromptState> {
  const client = getClient();
  const installUrl = getInstallUrl(options);
  const timeoutMs = options.timeoutMs ?? 1500;

  const available = await client.isAvailable(timeoutMs);
  if (!available) {
    return {
      isAvailable: false,
      capabilities: null,
      installUrl,
      reloadAfterInstall: true,
      recommendedAction: 'install-extension',
    };
  }

  const capabilities = await client.getCapabilities(timeoutMs);
  if (!capabilities) {
    return {
      isAvailable: false,
      capabilities: null,
      installUrl,
      reloadAfterInstall: true,
      recommendedAction: 'install-extension',
    };
  }

  if (!capabilities.vaultUnlocked) {
    return {
      isAvailable: true,
      capabilities,
      installUrl,
      reloadAfterInstall: false,
      recommendedAction: 'unlock-vault',
    };
  }

  if (!capabilities.siteApproved) {
    return {
      isAvailable: true,
      capabilities,
      installUrl,
      reloadAfterInstall: false,
      recommendedAction: 'approve-site',
    };
  }

  return {
    isAvailable: true,
    capabilities,
    installUrl,
    reloadAfterInstall: false,
    recommendedAction: 'ready',
  };
}
