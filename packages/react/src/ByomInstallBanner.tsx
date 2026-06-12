import { getInstallUrl, type RecommendedAction } from '@byomsdk/sdk';
import { useByomCapabilities } from './useByomCapabilities.js';

const ACTION_MESSAGES: Record<RecommendedAction, string> = {
  'install-extension': 'Install BYOM Wallet to use your own AI providers on this site.',
  'unlock-vault': 'Unlock BYOM Wallet in the extension side panel.',
  'approve-site': 'Approve this site when you run your first AI action.',
  'configure-provider': 'Add an AI provider in BYOM Wallet.',
  ready: '',
};

export interface ByomInstallBannerProps {
  className?: string;
}

export function ByomInstallBanner({ className }: ByomInstallBannerProps) {
  const { isAvailable, capabilities, loading } = useByomCapabilities();

  if (loading) {
    return <div className={className}>Checking BYOM…</div>;
  }

  let action: RecommendedAction = 'ready';
  if (!isAvailable) {
    action = 'install-extension';
  } else if (capabilities && !capabilities.vaultUnlocked) {
    action = 'unlock-vault';
  } else if (capabilities && !capabilities.siteApproved) {
    action = 'approve-site';
  }

  if (action === 'ready') {
    return null;
  }

  const message = ACTION_MESSAGES[action];

  return (
    <div className={className} role="status">
      <span>{message}</span>
      {action === 'install-extension' && (
        <>
          {' '}
          <a href={getInstallUrl()} target="_blank" rel="noreferrer">
            Install from GitHub Releases
          </a>
        </>
      )}
    </div>
  );
}
