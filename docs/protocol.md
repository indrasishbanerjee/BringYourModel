# BYOM wire protocol

Protocol version: **`1.0.0`** (`byom@1.0.0` port name)

## Versioning

- **Same major** versions are compatible (e.g. SDK `1.0.1` ↔ extension `1.2.0`).
- Breaking changes require a major bump on both sides.

## Realms

1. **Page** — `@byomsdk/sdk` dispatches CustomEvents on `#byom-bridge`
2. **Isolated content script** — validates and forwards to service worker
3. **Background** — vault, consent, routing, provider calls

## Event names

| Event | Direction |
|-------|-----------|
| `byom:ping` / `byom:pong` | Availability |
| `byom:request` | Page → extension |
| `byom:response` / `byom:delta` / `byom:finish` | Extension → page |
| `byom:error` / `byom:abort` | Both |
| `byom:event` | Extension push (vault-locked, budget-warning, etc.) |

## Request envelope

```typescript
{
  reqId: string;
  origin: string;
  protocolVersion: '1.0.0';
  nonce: string;
  timestamp: number;
  task: 'ask' | 'stream' | 'embed' | 'classify' | 'extract' | 'chat';
  payload: object;
}
```

## Error codes

See [SDK API error matrix](sdk-api.md#error-matrix).

## Compatibility surfaces

Optional metadata tag for adapter calls (informational only):

```typescript
{ compat: { surface: 'openai-chat-completions', sdkVersion: '0.2.0' } }
```

Authorization remains based on origin, grant, task, and provider rules.

See [architecture.md](architecture.md) for diagrams.
