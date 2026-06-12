# Bring Your Model

[![CI](https://github.com/indrasishbanerjee/BringYourModel/actions/workflows/ci.yml/badge.svg)](https://github.com/indrasishbanerjee/BringYourModel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@byomsdk/sdk)](https://www.npmjs.com/package/@byomsdk/sdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Your AI keys. Your models. Your rules — on every website.**

[Bring Your Model](https://bringyourmodel.com) is an open-source **AI wallet for Chrome**: users connect their own providers (OpenAI, Anthropic, Google, OpenRouter, Ollama, LM Studio, and more), and websites call AI through a small SDK — without ever touching API keys.

Think **MetaMask for AI access** or **Stripe.js for inference**: the extension is the trust boundary; the site gets capabilities, not credentials.

## Links

| Resource | Link |
|----------|------|
| **Website** | [bringyourmodel.com](https://bringyourmodel.com) |
| **Live demo** | [bringyourmodel.com/demo](https://bringyourmodel.com/demo/) |
| **Chrome Extension** | [Install from Chrome Web Store](https://chromewebstore.google.com/detail/byom-wallet/jnpajlpoemfgehchogeboncaikdoggdd) |
| **npm SDK** | [@byomsdk/sdk on npm](https://www.npmjs.com/package/@byomsdk/sdk) |

---

## Why BYOM

| Problem today | How BYOM helps |
|---------------|----------------|
| Sites pay for AI or bake keys into backends | Users bring their own plans and keys |
| Users paste API keys into untrusted UIs | Keys stay in an encrypted extension vault |
| No per-site spend or model control | Consent prompts, budgets, grants, and routing policies |
| Every app reinvents provider wiring | One SDK: `byom.ask()`, `byom.stream()`, `byom.embed()`, and more |

**Motto:** *Bring your model. Browse with power. Stay in control.*

---

## How it works

```mermaid
flowchart LR
  Site["Website + @byomsdk/sdk"]
  Bridge["Three-realm bridge"]
  Ext["Chrome extension"]
  Vault["Vault + policy + router"]
  LLM["User's AI providers"]

  Site --> Bridge --> Ext --> Vault --> LLM
```

1. **User** installs the extension, unlocks the vault, and adds providers.
2. **Website** loads `@byomsdk/sdk` and requests an AI task.
3. **Extension** validates the origin, checks grants/budgets, shows consent when needed, routes to the right model, and returns the result.
4. **API keys never enter the page** — only approved responses do.

Details: [Architecture](docs/architecture.md) · [Security](docs/security.md) · [Install](docs/install.md)

---

## Who it's for

- **Users** who want one wallet for AI across the web, with spend caps and privacy choices — including **local-first** setups with Ollama or LM Studio.
- **Developers** who want AI features without hosting inference for every visitor. BYOM users route through their vault; everyone else can use your backend via the [fallback helper](docs/fallback-strategy.md).
- **Builders** integrating BYOM into SaaS, copilots, support tools, and in-page assistants.

---

## Packages

| Package | Role |
|---------|------|
| [`packages/extension`](packages/extension) | Chrome extension (OpenModelRouter engine, vault, consent UI) |
| [`packages/sdk`](packages/sdk) | [`@byomsdk/sdk`](https://www.npmjs.com/package/@byomsdk/sdk) — website integration |
| [`packages/react`](packages/react) | [`@byomsdk/react`](packages/react) — React hooks and install banner |
| [`packages/shared`](packages/shared) | Zod schemas, protocol types, shared errors |
| [`packages/demo-site`](packages/demo-site) | Local demo app (also at [bringyourmodel.com/demo](https://bringyourmodel.com/demo/)) |
| [`packages/e2e`](packages/e2e) | Playwright end-to-end tests |

---

## Quick start

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9+

### Install and run

```bash
pnpm install

# Terminal 1: extension (load unpacked from packages/extension/.output/chrome-mv3)
pnpm dev

# Terminal 2: demo site
pnpm --filter @byom/demo-site dev
```

Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/byom-wallet/jnpajlpoemfgehchogeboncaikdoggdd), or load a dev build from `packages/extension/.output/chrome-mv3` in `chrome://extensions` (Developer mode → Load unpacked).

### Build and test

```bash
pnpm build
pnpm test
pnpm --filter @byom/e2e test

# Chrome Web Store zip
pnpm --filter @byom/extension zip
```

---

## SDK example

```typescript
import { byom, createByomWithFallback } from '@byomsdk/sdk';

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

const result = await ai.ask({
  task: 'summarize',
  input: 'Long text to summarize...',
});

console.log(result.text);
```

**OpenAI-style client:**

```typescript
import { OpenAI } from '@byomsdk/sdk/openai';

const client = new OpenAI();
const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Summarize this page.' }],
});
```

**CDN (IIFE):**

```html
<script src="https://cdn.jsdelivr.net/npm/@byomsdk/sdk/dist/byom.iife.min.global.js"></script>
<script>
  byom.ask({ task: 'summarize', input: '...' }).then((r) => console.log(r.text));
</script>
```

Full API: [SDK API](docs/sdk-api.md) · [Fallback strategy](docs/fallback-strategy.md) · [OpenAI compat](docs/openai-compat.md) · [Prompt API compat](docs/prompt-api-compat.md)

---

## Documentation

- [Install](docs/install.md) — extension install
- [Architecture](docs/architecture.md) — three-realm bridge, ports, message flow
- [Security](docs/security.md) — vault, nonce replay, prompt shield, consent
- [SDK API](docs/sdk-api.md) — methods, streaming, errors
- [Fallback strategy](docs/fallback-strategy.md) — progressive enhancement
- [OpenAI compatibility](docs/openai-compat.md) — drop-in OpenAI-style client
- [Prompt API compatibility](docs/prompt-api-compat.md) — LanguageModel shim
- [Protocol](docs/protocol.md) — wire format and versioning
- [Policy DSL](docs/policy-dsl.md) — grants, budgets, model allowlists
- [Roadmap](ROADMAP.md)

---

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Please avoid committing secrets, build artifacts (`dist/`, `.output/`), or local planning notes.

---

## License

[Apache License 2.0](LICENSE)
