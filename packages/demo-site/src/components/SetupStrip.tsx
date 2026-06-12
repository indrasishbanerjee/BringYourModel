import React from 'react';
import type { Capabilities } from '@byomsdk/sdk';

const INSTALL_URL =
  'https://chromewebstore.google.com/detail/byom-wallet/jnpajlpoemfgehchogeboncaikdoggdd';

interface SetupStripProps {
  capabilities: Capabilities | null;
  isAvailable: boolean | null;
}

export const SetupStrip: React.FC<SetupStripProps> = ({ capabilities, isAvailable }) => {
  return (
    <section className="setup-strip">
      <h2>Setup checklist</h2>
      <ol className="setup-steps">
        <li>
          <a href={INSTALL_URL} target="_blank" rel="noreferrer">
            Install BYOM Wallet
          </a>{' '}
          from Chrome Web Store
        </li>
        <li>Unlock the vault in the extension side panel</li>
        <li>
          Add a provider — Ollama/LM Studio for local-first, or a hosted API key for cloud
        </li>
        <li>Run a recipe — approve this site when the consent dialog appears</li>
      </ol>
      <p className="setup-hint">
        <strong>Local-first?</strong> Run Ollama or LM Studio, add the provider in BYOM, and set
        routing to prefer local models.
      </p>
      <p className="setup-hint">
        <strong>Building a web app?</strong> See the fallback helper recipes in the SDK docs for
        progressive enhancement.
      </p>
      {isAvailable && capabilities && (
        <div className="capability-grid">
          <div className="capability-item">
            <strong>Site approved</strong>
            {capabilities.siteApproved ? 'Yes' : 'No'}
          </div>
          <div className="capability-item">
            <strong>Vault unlocked</strong>
            {capabilities.vaultUnlocked ? 'Yes' : 'No'}
          </div>
          <div className="capability-item">
            <strong>Tasks</strong>
            {capabilities.supportedTasks.join(', ')}
          </div>
        </div>
      )}
    </section>
  );
};
