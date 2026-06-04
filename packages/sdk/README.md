# @byomsdk/sdk

Browser SDK for websites that integrate with the [Bring Your Model](https://bringyourmodel.com) extension.

Bring Your Model lets users connect their own AI providers in a browser extension and approve which websites can use them. This SDK gives websites a small, zero-dependency API for text generation, streaming, embeddings, classification, extraction, chat sessions, extension events, and capability checks.

## Requirements

- **Browser only** — uses `window`, `document`, and `crypto`. Not for Node.js or SSR.
- Users must have the Bring Your Model browser extension installed.
- Users must configure at least one provider in the extension.
- The site must be approved by the user before provider calls run.

## Install

```bash
npm install @byomsdk/sdk
```

## Quick start

```typescript
import { byom } from '@byomsdk/sdk';

const available = await byom.isAvailable();
if (!available) {
  throw new Error('Bring Your Model extension is not available');
}

const caps = await byom.getCapabilities();
if (!caps?.vaultUnlocked) {
  throw new Error('Unlock the extension vault first');
}

const result = await byom.ask({
  task: 'summarize',
  input: 'Long text to summarize...',
});

console.log(result.text, result.costUSD);
```

## Streaming

```typescript
import { byom } from '@byomsdk/sdk';

async function runStream() {
  const gen = byom.stream({ input: 'Write a haiku about TypeScript.' });
  let result = await gen.next();

  while (!result.done) {
    console.log(result.value.text);
    result = await gen.next();
  }

  const finish = result.value;
  console.log(finish.model, finish.costUSD);
}
```

## Chat session

```typescript
import { byom } from '@byomsdk/sdk';

const session = byom.chat({ systemMessage: 'You are a concise assistant.' });

const reply = await session.send('What is BYOM?');
console.log(reply.text);

console.log(session.history());
session.close();
```

## Error handling

All methods throw typed errors. Use `instanceof` for recoverable cases:

```typescript
import {
  byom,
  BudgetExceededError,
  PermissionDeniedError,
  ExtensionNotInstalledError,
  ByomError,
} from '@byomsdk/sdk';

try {
  await byom.ask({ input: 'Hello' });
} catch (err) {
  if (err instanceof ExtensionNotInstalledError) {
    // prompt user to install the extension
  } else if (err instanceof PermissionDeniedError) {
    // site needs consent — trigger a request to open the consent flow
  } else if (err instanceof BudgetExceededError) {
    console.log(err.details); // { budgetType, current, limit }
  } else if (err instanceof ByomError) {
    console.log(err.code, err.message);
  }
}
```

## Configuration

For advanced use, create a client with a custom timeout (applied on first `getClient()` call only):

```typescript
import { getClient } from '@byomsdk/sdk';

const client = getClient({ timeoutMs: 60_000 });
await client.ask({ input: 'Long running task...' });
```

## CDN (IIFE)

```html
<script src="https://cdn.jsdelivr.net/npm/@byomsdk/sdk/dist/byom.iife.min.global.js"></script>
<script>
  byom.isAvailable().then(function (ok) {
    if (!ok) return;
    return byom.ask({ input: 'Hello from BYOM' });
  }).then(function (result) {
    if (result) console.log(result.text);
  });
</script>
```

The IIFE build attaches `byom` to `window.byom`.

## Teardown

`byom.destroy()` disconnects the bridge and resets global state. Use in tests or SPA unmount — not required for normal pages.

## API reference

Full API documentation: [docs/sdk-api.md](../../docs/sdk-api.md)

### Main methods

| Method | Description |
|--------|-------------|
| `byom.isAvailable()` | Ping the extension bridge |
| `byom.getCapabilities()` | Version, supported tasks, grant/vault status |
| `byom.ask()` | Single-shot text generation |
| `byom.stream()` | Streaming text generation |
| `byom.embed()` | Embedding vectors |
| `byom.classify()` | Text classification |
| `byom.extract()` | Structured extraction via JSON Schema |
| `byom.chat()` | Multi-turn chat session |
| `byom.on()` | Subscribe to extension events |
| `byom.destroy()` | Tear down global bridge/client state |

## License

Apache-2.0 — see [LICENSE](./LICENSE).
