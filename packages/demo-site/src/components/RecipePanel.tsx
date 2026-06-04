import React from 'react';
import type { Recipe } from '../examples/types';
import { useRecipeRunner } from '../hooks/useRecipeRunner';
import { CodeBlock } from './CodeBlock';
import { ResultPanel } from './ResultPanel';

interface RecipePanelProps {
  recipe: Recipe;
}

export const RecipePanel: React.FC<RecipePanelProps> = ({ recipe }) => {
  const {
    form,
    updateForm,
    result,
    streamedText,
    error,
    isLoading,
    isStreaming,
    chatMessages,
    loadSample,
    run,
    cancel,
    canRun,
  } = useRecipeRunner(recipe);

  const isConversation =
    recipe.kind === 'chat-send' || recipe.kind === 'chat-stream';

  const displayText = streamedText || result?.text || '';
  const runLabel = recipe.runLabel ?? 'Run';

  return (
    <article className="recipe-panel">
      <h2>{recipe.title}</h2>
      <p className="recipe-description">{recipe.description}</p>

      <CodeBlock code={recipe.code} />

      {!recipe.codeOnly && (
        <>
          {isConversation && chatMessages.length > 0 && (
            <div className="chat-history" data-testid="chat-history">
              {chatMessages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  className={`chat-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}
                >
                  <span className="chat-bubble-inner">
                    <span className="chat-role">{msg.role}</span>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          {recipe.kind === 'embed-faq' ? (
            <>
              <div className="field">
                <label htmlFor="faq-query">User question</label>
                <textarea
                  id="faq-query"
                  value={form.input}
                  onChange={(e) => updateForm({ input: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="field">
                <label htmlFor="faq-entry">FAQ entry</label>
                <textarea
                  id="faq-entry"
                  value={form.inputSecondary}
                  onChange={(e) => updateForm({ inputSecondary: e.target.value })}
                  rows={4}
                />
              </div>
            </>
          ) : recipe.kind !== 'extension-check' ? (
            <div className="field">
              <label htmlFor="recipe-input">
                {isConversation ? 'Message' : 'Input'}
              </label>
              <textarea
                id="recipe-input"
                value={form.input}
                onChange={(e) => updateForm({ input: e.target.value })}
                rows={isConversation ? 3 : 8}
              />
            </div>
          ) : null}

          {recipe.kind === 'classify' && (
            <div className="field">
              <label htmlFor="categories">Categories (comma-separated)</label>
              <input
                id="categories"
                type="text"
                value={form.categories}
                onChange={(e) => updateForm({ categories: e.target.value })}
              />
            </div>
          )}

          {recipe.kind === 'extract' && (
            <div className="field">
              <label htmlFor="schema">Extraction schema (JSON properties)</label>
              <textarea
                id="schema"
                className="mono"
                value={form.extractSchema}
                onChange={(e) => updateForm({ extractSchema: e.target.value })}
                rows={6}
              />
            </div>
          )}

          {isConversation && (
            <div className="field">
              <label htmlFor="system">System message</label>
              <textarea
                id="system"
                value={form.systemMessage}
                onChange={(e) => updateForm({ systemMessage: e.target.value })}
                rows={2}
              />
            </div>
          )}

          <div className="actions">
            {recipe.defaults.input !== undefined && recipe.kind !== 'extension-check' && (
              <button type="button" className="btn btn-secondary" onClick={loadSample}>
                Load sample
              </button>
            )}
            {recipe.kind === 'extension-check' && (
              <button type="button" className="btn btn-secondary" onClick={loadSample}>
                Reset
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              data-testid="recipe-run"
              disabled={!canRun || isLoading || isStreaming}
              onClick={() => void run()}
            >
              {isLoading ? 'Processing…' : isStreaming ? 'Streaming…' : runLabel}
            </button>
            {isStreaming && (
              <button type="button" className="btn btn-danger" onClick={cancel}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {error && <div className="error-box">{error}</div>}

      <ResultPanel
        text={displayText}
        result={result}
        streamedText={streamedText}
        monospace={result?.monospace}
      />
    </article>
  );
};
