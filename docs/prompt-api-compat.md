# Prompt API / LanguageModel compatibility

Opt-in shim for Chrome's **LanguageModel** Prompt API shape, backed by BYOM providers.

## Explicit usage (recommended)

```typescript
import { createPromptApi } from '@byomsdk/sdk/prompt-api';

const ai = createPromptApi();
const session = await ai.languageModel.create({ systemPrompt: 'You are helpful.' });
const answer = await session.prompt('Summarize this page.');
```

## Global install (opt-in)

```typescript
import { installPromptApiShim } from '@byomsdk/sdk/prompt-api';

const result = installPromptApiShim({ mode: 'if-missing' });
// Does not overwrite native Chrome LanguageModel by default

if (result.installed) {
  const session = await LanguageModel.create();
  const text = await session.prompt('Hello');
}
```

## Modes

| Mode | Behavior |
|------|----------|
| `if-missing` | Install only if `LanguageModel` is absent (default) |
| `prefer-byom` | Install BYOM shim |
| `force` | Overwrite existing `LanguageModel` |

## Availability mapping

| BYOM state | `availability()` |
|------------|------------------|
| Extension missing | `unavailable` |
| Vault locked | `downloadable` |
| Ready | `available` |

Native Chrome on-device models are never overwritten unless `mode: 'force'`.
