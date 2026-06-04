import React from 'react';
import type { RecipeRunResult } from '../examples/types';

interface ResultPanelProps {
  text: string;
  result: RecipeRunResult | null;
  streamedText?: string;
  monospace?: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  text,
  result,
  streamedText,
  monospace,
}) => {
  const display = streamedText || text;
  if (!display) return null;

  const meta = result?.metadata;
  const isMono = monospace ?? result?.monospace;

  return (
    <div className="result-section">
      <h3>Result</h3>
      <div
        data-testid="stream-output"
        className={`result-output${isMono ? ' mono' : ''}`}
      >
        {display}
      </div>
      {meta && (
        <div className="result-meta">
          {meta.model && <span>Model: {meta.model}</span>}
          {meta.provider && <span>Provider: {meta.provider}</span>}
          {meta.costUSD !== undefined && <span>Cost: ${meta.costUSD.toFixed(4)}</span>}
          {meta.latencyMs !== undefined && <span>Latency: {meta.latencyMs}ms</span>}
          {meta.usage?.totalTokens !== undefined && (
            <span>Tokens: {meta.usage.totalTokens}</span>
          )}
          {meta.usage?.tokens !== undefined && (
            <span>Tokens: {meta.usage.tokens}</span>
          )}
        </div>
      )}
    </div>
  );
};
