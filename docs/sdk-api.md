# BYOM SDK API Reference

The `@byomsdk/sdk` package exposes a single global-style API object: `byom`. Install via npm or load the IIFE build from a CDN.

```bash
npm install @byomsdk/sdk
```

```typescript
import { byom } from '@byomsdk/sdk';
// or: const byom = window.byom  (IIFE build)
```

## Prerequisites

1. User has the **Bring Your Model** Chrome extension installed.
2. Extension vault is unlocked (for provider calls).
3. Site has an active **Grant** (created via consent on first request).

Check readiness:

```typescript
const caps = await byom.getCapabilities();
if (!caps?.vaultUnlocked) {
  alert('Unlock the BYOM extension vault first.');
}
```

---

## `byom.isAvailable()`

Check whether the extension bridge responds.

```typescript
const available = await byom.isAvailable({ timeoutMs: 1000 });
// true | false
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeoutMs` | `number` | `1000` | Ping timeout in milliseconds |

**Returns:** `Promise<boolean>`

**Example:**

```typescript
if (!(await byom.isAvailable())) {
  console.warn('Install Bring Your Model extension');
  return;
}
```

---

## `byom.getCapabilities()`

Query extension version, supported tasks, and site approval status.

```typescript
const caps = await byom.getCapabilities(2000);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeoutMs` | `number` | `2000` | Ping timeout |

**Returns:** `Promise<Capabilities | null>`

```typescript
interface Capabilities {
  extensionVersion: string;
  supportedTasks: ('ask' | 'stream' | 'embed' | 'classify' | 'extract' | 'chat')[];
  siteApproved: boolean;
  vaultUnlocked: boolean;
}
```

Returns `null` if the extension is unavailable or does not respond in time.

---

## `byom.ask()`

Single-shot text generation.

```typescript
const result = await byom.ask({
  input: 'Summarize this article…',
  task: 'summarize',       // optional: 'summarize' | 'draft' | 'chat'
  model: 'gpt-4o-mini',    // optional
  temperature: 0.7,        // optional, 0–2
  maxTokens: 1000,         // optional
  messages: [              // optional alternative to input
    { role: 'user', content: 'Hello' },
  ],
}, abortSignal);
```

**Returns:** `Promise<AskResponse>`

```typescript
interface AskResponse {
  text: string;
  model: string;
  provider: ProviderId;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  costUSD: number;
  latencyMs: number;
}

type ProviderId =
  | 'openai' | 'anthropic' | 'google' | 'mistral' | 'groq' | 'cohere'
  | 'deepseek' | 'together' | 'fireworks' | 'perplexity' | 'xai' | 'cerebras'
  | 'openrouter' | 'ollama' | 'lmstudio';
```

**Example:**

```typescript
try {
  const { text, costUSD } = await byom.ask({
    task: 'summarize',
    input: document.body.innerText.slice(0, 5000),
  });
  console.log(text, `($${costUSD.toFixed(4)})`);
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    // User denied consent or site not approved
  }
}
```

---

## `byom.stream()`

Streaming text generation. Returns an async generator that yields chunks and returns a finish object.

```typescript
async function streamExample() {
  const gen = byom.stream({ input: 'Write a poem about TypeScript.' });
  let result = await gen.next();

  while (!result.done) {
    process.stdout.write(result.value.text);
    result = await gen.next();
  }

  const finish = result.value; // StreamFinish: { model, provider, usage, costUSD, latencyMs }
  console.log(finish.costUSD);
}
```

| Chunk field | Type | Description |
|-------------|------|-------------|
| `text` | `string` | Incremental text |
| `isComplete` | `boolean` | Whether this is the final chunk |
| `usage` | `object?` | Partial token counts |

**Cancel a stream:**

```typescript
const controller = new AbortController();
const gen = byom.stream({ input: '…' }, controller.signal);

setTimeout(() => controller.abort(), 5000);

try {
  for await (const chunk of gen) { /* … */ }
} catch (err) {
  // ByomError with code ABORTED
}
```

---

## `byom.embed()`

Generate a vector embedding for text.

```typescript
const { embedding, model, provider } = await byom.embed({
  input: 'semantic search query',
  model: 'text-embedding-3-small', // optional
});
// embedding: number[]
```

Supported providers: **OpenAI**, **Google**. Other providers return `PROVIDER_UNAVAILABLE`.

---

## `byom.classify()`

Classify text into one of the provided categories.

```typescript
const result = await byom.classify(
  'This product is amazing!',
  ['positive', 'negative', 'neutral'],
  { model: 'gpt-4o-mini', signal: abortSignal }
);
// { category: 'positive', confidence: 0.95, model, provider, usage, costUSD, latencyMs }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | Text to classify |
| `categories` | `string[]` | Allowed category labels |
| `options.model` | `string?` | Model override |
| `options.signal` | `AbortSignal?` | Cancellation |

---

## `byom.extract()`

Extract structured data using a JSON Schema description.

```typescript
interface Person {
  name: string;
  age: number;
}

const person = await byom.extract<Person>({
  input: 'John Smith is 34 years old.',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
    required: ['name', 'age'],
  },
});
// { name: 'John Smith', age: 34 }
```

The response is the extracted object directly (not wrapped).

---

## `byom.chat()`

Create a stateful multi-turn chat session with local message history.

```typescript
const session = byom.chat({
  sessionId: 'my-session',       // optional, auto-generated if omitted
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  systemMessage: 'You are a helpful assistant.',
});

const reply = await session.send('What is BYOM?');
console.log(reply.text);

// Stream a turn
for await (const chunk of session.stream('Tell me more.')) {
  process.stdout.write(chunk.text);
}

console.log(session.history()); // full Message[]
session.close();
```

### `ChatSession` methods

| Method | Returns | Description |
|--------|---------|-------------|
| `send(message, signal?)` | `Promise<ChatResponse>` | Send one turn, append to history |
| `stream(message, signal?)` | `AsyncGenerator<StreamChunk, StreamFinish>` | Stream one turn |
| `history()` | `Message[]` | Copy of conversation messages |
| `close()` | `void` | Clear history; further calls throw |
| `id` (getter) | `string` | Session ID sent to extension |

---

## `byom.on()`

Subscribe to extension push events. Returns an unsubscribe function.

```typescript
const unsub = byom.on('budget-warning', (payload) => {
  console.warn('Budget warning:', payload.data);
});

// Later:
unsub();
```

| Event | When fired |
|-------|------------|
| `vault-locked` | Vault was locked during an active session |
| `budget-warning` | Daily spend reached ≥ 80% of grant budget |
| `permission-needed` | Consent dialog opened for this origin |
| `request-complete` | A request finished (success or error) |

```typescript
interface ByomEventPayload {
  event: ByomEventType;
  origin?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}
```

---

## Error Handling

All SDK methods throw typed errors from `@byomsdk/sdk`:

| Class | Code(s) |
|-------|---------|
| `ExtensionNotInstalledError` | `EXTENSION_NOT_INSTALLED`, `EXTENSION_DISABLED` |
| `PermissionDeniedError` | `PERMISSION_DENIED`, `SITE_NOT_APPROVED` |
| `BudgetExceededError` | `BUDGET_EXCEEDED` |
| `ProviderUnavailableError` | `PROVIDER_UNAVAILABLE` |
| `ByomError` | All other codes |

```typescript
import {
  byom,
  ByomError,
  ErrorCode,
  BudgetExceededError,
} from '@byomsdk/sdk';

try {
  await byom.ask({ input: 'Hello' });
} catch (err) {
  if (err instanceof BudgetExceededError) {
    console.log(err.details); // { budgetType, current, limit }
  } else if (err instanceof ByomError) {
    console.log(err.code, err.message);
  }
}
```

---

## Error Matrix

| Code | Typical cause | SDK error class | Recoverable? |
|------|---------------|-----------------|--------------|
| `EXTENSION_NOT_INSTALLED` | No extension installed | `ExtensionNotInstalledError` | Install extension |
| `EXTENSION_DISABLED` | Bridge relay element not found | `ExtensionNotInstalledError` | Install or enable extension |
| `PROTOCOL_VERSION_MISMATCH` | SDK and extension version mismatch | `ByomError` | Update SDK or extension |
| `PERMISSION_DENIED` | User denied consent, origin mismatch | `PermissionDeniedError` | Re-request; user approves |
| `SITE_NOT_APPROVED` | No grant for origin | `PermissionDeniedError` | Trigger consent flow |
| `BUDGET_EXCEEDED` | Daily/monthly/per-request limit hit | `BudgetExceededError` | Wait or raise budget in extension |
| `RATE_LIMITED` | Too many requests | `ByomError` | Back off and retry |
| `TASK_NOT_ALLOWED` | Task not in grant | `ByomError` | Update grant permissions |
| `MODEL_NOT_ALLOWED` | Model not in allowlist | `ByomError` | Use allowed model |
| `PROVIDER_UNAVAILABLE` | No provider configured / task unsupported | `ProviderUnavailableError` | Configure provider in extension |
| `PROVIDER_ERROR` | Upstream API failure | `ByomError` | Retry or check provider status |
| `INVALID_API_KEY` | Bad credentials | `ByomError` | Update API key in extension |
| `QUOTA_EXHAUSTED` | Provider quota exceeded | `ByomError` | Check provider billing |
| `INVALID_REQUEST` | Replay detected, bad payload | `ByomError` | Generate fresh request |
| `SCHEMA_VALIDATION_FAILED` | Invalid request shape | `ByomError` | Fix request parameters |
| `TIMEOUT` | Request exceeded SDK timeout | `ByomError` | Retry with longer timeout |
| `ABORTED` | `AbortSignal` fired | `ByomError` | Expected on cancel |
| `INTERNAL_ERROR` | Unexpected SW error | `ByomError` | Report bug |
| `VAULT_LOCKED` | Vault not unlocked | `ByomError` | User unlocks vault |

---

## CDN Usage (IIFE)

```html
<script src="https://cdn.jsdelivr.net/npm/@byomsdk/sdk/dist/byom.iife.min.global.js"></script>
<script>
  byom.isAvailable().then(function (ok) {
    if (!ok) return;
    return byom.ask({ task: 'summarize', input: 'Long text…' });
  }).then(function (result) {
    if (result) console.log(result.text);
  });
</script>
```

The IIFE build attaches `byom` to `window.byom`.

---

## Configuration

Request timeout defaults to **30 seconds**. Override via `getClient()` (config applies on the **first** call only):

```typescript
import { getClient } from '@byomsdk/sdk';

const client = getClient({ timeoutMs: 60_000 });
await client.ask({ input: 'Long task…' });
```

---

## `byom.destroy()`

Tear down the global bridge and client instances. Intended for **tests and SPA teardown** — not required for normal page usage.

```typescript
byom.destroy();
```

---

## Type Exports

Re-exported from `@byomsdk/sdk` for TypeScript consumers:

**Types:** `AskRequest`, `AskResponse`, `EmbedRequest`, `EmbedResponse`, `ExtractRequest`, `ExtractResponse`, `ChatRequest`, `ChatResponse`, `Message`, `StreamChunk`, `StreamFinish`, `ClassifyResponse`, `Capabilities`, `ProviderId`, `TaskType`, `ByomEventType`, `ByomEventPayload`, `ByomClientConfig`

**Classes / values:** `ErrorCode`, `ByomError`, `ExtensionNotInstalledError`, `PermissionDeniedError`, `BudgetExceededError`, `ProviderUnavailableError`, `deserializeByomError`, `ChatSession`, `ByomClient`, `getClient`, `byom`

---

## Related Docs

- [Architecture](./architecture.md)
- [Security](./security.md)
- [Policy DSL](./policy-dsl.md)
