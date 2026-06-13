# @byomsdk/sdk

## 0.3.0

### Minor Changes

- Add progressive-enhancement helpers: `createByomWithFallback`, `runWithByomFallback`, `detectByomMode`.
- Add install prompt utilities: `getInstallUrl`, `createInstallPromptState` (defaults to Chrome Web Store).
- Add `@byomsdk/sdk/openai` — OpenAI-style client (`chat.completions`, `responses`, `embeddings`).
- Add `@byomsdk/sdk/prompt-api` — LanguageModel-first Prompt API shim.
- Export `DEFAULT_CHROME_WEB_STORE_URL` and `DEFAULT_GITHUB_RELEASES_URL`.

## 0.2.0

### Minor Changes

- Add `byom.chat()` for multi-turn chat sessions with history and `close()`.
- Add `byom.on()` for extension event subscriptions (grant, vault, routing).
- Add `byom.classify()` and `byom.extract()` for structured AI tasks.
- Improve protocol bridge: heartbeats, typed errors (`ByomError` hierarchy), and capability checks.
- Expand test coverage (protocol sync, client, bridge, chat session).
- Fix package metadata: Apache-2.0 license, public GitHub repository links.

## 0.1.0

### Minor Changes

- 4141dca: Initial public release of `@byomsdk/sdk` at 0.1.0 with a self-contained browser SDK for the Bring Your Model extension.
