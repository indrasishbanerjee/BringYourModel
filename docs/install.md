# Install BYOM Wallet

BYOM Wallet is a Chrome extension (Manifest V3). Chromium browsers (Chrome, Edge, Brave) are supported.

## Install from Chrome Web Store (recommended)

1. Open the [BYOM Wallet listing](https://chromewebstore.google.com/detail/byom-wallet/jnpajlpoemfgehchogeboncaikdoggdd).
2. Click **Add to Chrome**.
3. Pin **BYOM Wallet** from the toolbar and open the side panel to unlock your vault.

## Manual install from GitHub Releases

For advanced users or when you need a specific build:

1. Open [GitHub Releases](https://github.com/indrasishbanerjee/BringYourModel/releases/latest).
2. Download the Chrome zip artifact (for example `byomextension-1.0.0-chrome.zip`).
3. Unzip the file to a folder on your computer.
4. Open `chrome://extensions` (or your browser's extension page).
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the unzipped folder.

Verify the SHA256 checksum published alongside the release if you want to confirm the download.

## Developers: load from a local build

```bash
pnpm install
pnpm dev
# or: pnpm --filter @byom/extension build
```

Load unpacked from `packages/extension/.output/chrome-mv3`.

## Try the SDK without cloning

```bash
npm install @byomsdk/sdk
```

Visit the live playground: [bringyourmodel.com/demo](https://bringyourmodel.com/demo/)

Install the extension, unlock the vault, add a provider (Ollama for local-first), and approve the demo site when prompted.
