# Fallback strategy

BYOM is designed as **progressive enhancement**. Websites should work for all visitors; BYOM users get privacy and cost control through their own vault.

## Pattern

```typescript
import { createByomWithFallback } from '@byomsdk/sdk';

const ai = createByomWithFallback({
  askFallback: async (req, signal) => {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    return res.json();
  },
});

const result = await ai.ask({ input: 'Hello' });
```

## When fallback runs

| Error | Fallback? |
|-------|-----------|
| `EXTENSION_NOT_INSTALLED` | Yes (default) |
| `EXTENSION_DISABLED` | Yes (default) |
| `PROTOCOL_VERSION_MISMATCH` | Yes (optional) |
| `PERMISSION_DENIED` | No — show consent UI |
| `SITE_NOT_APPROVED` | No |
| `BUDGET_EXCEEDED` | No |
| `VAULT_LOCKED` | No — prompt unlock |
| `INVALID_API_KEY` | No — user provider config issue |

## Install prompt state

```typescript
import { createInstallPromptState } from '@byomsdk/sdk';

const state = await createInstallPromptState();
// state.recommendedAction: install-extension | unlock-vault | approve-site | ready
```

## Privacy copy for users

> When you have BYOM Wallet installed, this site uses **your** AI provider and **your** budget rules. Your API keys never enter this page. Without BYOM, the site uses its own AI backend.

## Local-first (no fallback)

For apps that require local models only, do not provide a fallback — link to [install docs](install.md) instead.
