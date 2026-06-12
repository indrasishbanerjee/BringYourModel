# OpenAI compatibility

Import `@byomsdk/sdk/openai` for an OpenAI-style client that routes through BYOM Wallet.

## Migration

**Before:**

```typescript
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**After:**

```typescript
import { OpenAI } from '@byomsdk/sdk/openai';

const client = new OpenAI();
```

## Supported methods (v1)

- `client.chat.completions.create` — non-streaming and streaming
- `client.responses.create` — text responses
- `client.embeddings.create` — string or array input (sequential by default)

## Unsupported

- `baseURL` — throws; BYOM uses the extension bridge, not HTTP
- `apiKey` — accepted but ignored; credentials come from the user's vault

## BYOM metadata

Responses include a `byom` field with `provider`, `costUSD`, and `latencyMs` when available.

## Errors

BYOM errors map to OpenAI-like classes: `BYOMExtensionUnavailableError`, `PermissionDeniedError`, `BYOMBudgetExceededError`, etc.
