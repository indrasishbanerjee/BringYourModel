import React, { useState } from 'react';
import { RECIPES, getRecipeById } from './examples/recipes';
import { useExtensionStatus } from './hooks/useExtensionStatus';
import { ExtensionBanner } from './components/ExtensionBanner';
import { SetupStrip } from './components/SetupStrip';
import { RecipeNav } from './components/RecipeNav';
import { RecipePanel } from './components/RecipePanel';
import { EventLog } from './components/EventLog';
import './styles/app.css';

export const App: React.FC = () => {
  const [activeRecipeId, setActiveRecipeId] = useState(RECIPES[0].id);
  const { isAvailable, capabilities, refresh } = useExtensionStatus();

  const activeRecipe = getRecipeById(activeRecipeId) ?? RECIPES[0];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bring Your Model</h1>
        <p className="app-tagline">SDK playground — copy examples into your app</p>
      </header>

      <ExtensionBanner isAvailable={isAvailable} capabilities={capabilities} />
      <SetupStrip capabilities={capabilities} isAvailable={isAvailable} />

      <div className="layout">
        <RecipeNav activeId={activeRecipeId} onSelect={setActiveRecipeId} />
        <div>
          <RecipePanel key={activeRecipe.id} recipe={activeRecipe} />
        </div>
      </div>

      <EventLog />

      <footer className="app-footer">
        <p>
          This demo uses the <code>byom</code> SDK.{' '}
          <a
            href="https://github.com/indraai/bringyourmodel/blob/main/docs/sdk-api.md"
            target="_blank"
            rel="noreferrer"
          >
            API reference
          </a>
        </p>
        {isAvailable && (
          <p>
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
              Refresh extension status
            </button>
          </p>
        )}
      </footer>
    </div>
  );
};
