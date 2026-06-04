import React from 'react';
import type { Capabilities } from '@byomsdk/sdk';

interface SetupStripProps {
  capabilities: Capabilities | null;
  isAvailable: boolean | null;
}

export const SetupStrip: React.FC<SetupStripProps> = ({ capabilities, isAvailable }) => {
  return (
    <section className="setup-strip">
      <h2>Setup checklist</h2>
      <ol className="setup-steps">
        <li>Install the BYOM Chrome extension</li>
        <li>Unlock the vault in the extension popup</li>
        <li>Run a recipe — approve this site when the consent dialog appears</li>
      </ol>
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
