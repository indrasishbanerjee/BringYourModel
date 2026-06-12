# Contributing to Bring Your Model

Thank you for your interest in contributing!

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9.15+

### Setup

```bash
git clone https://github.com/indrasishbanerjee/BringYourModel.git
cd BringYourModel
pnpm install
pnpm --filter @byom/extension exec wxt prepare
```

### Development

```bash
# Terminal 1: extension with HMR
pnpm dev

# Terminal 2: demo site
pnpm --filter @byom/demo-site dev
```

Load the extension from `packages/extension/.output/chrome-mv3` in `chrome://extensions` (Developer mode → Load unpacked).

### Verify changes

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e    # requires Playwright + built extension
pnpm build
```

## Project structure

| Package | Purpose |
|---------|---------|
| `packages/extension` | Chrome MV3 extension |
| `packages/sdk` | Published `@byomsdk/sdk` |
| `packages/react` | Published `@byomsdk/react` |
| `packages/shared` | Shared Zod schemas and protocol types |
| `packages/demo-site` | Local SDK playground |
| `packages/e2e` | Playwright tests |

## Adding a provider

1. Add the provider id to `ProviderIdSchema` in `packages/shared/src/schemas.ts`
2. Create an adapter in `packages/extension/modules/openmodelrouter/providers/`
3. Register it in `PROVIDER_REGISTRY` (`providers/registry.ts`)
4. Add pricing rows in `telemetry/pricing.ts` if applicable
5. Add tests and update docs

## Pull requests

- Keep PRs focused; one feature or fix per PR
- Add or update tests for behavior changes
- Update user-facing docs when APIs change
- Do not commit secrets, `.env` files, or build artifacts (`dist/`, `.output/`)
- Update `PROJECT_MEMORY.md` with status, files changed, and decisions (required for agent-assisted work in this repo)

## Code style

- TypeScript strict mode
- Zod validation at trust boundaries
- Use Dashboard RPC for extension UI state — do not access stores directly from UI entrypoints

## Questions

Open a [GitHub Discussion](https://github.com/indrasishbanerjee/BringYourModel/discussions) or issue for non-security questions. See [SUPPORT.md](SUPPORT.md).
