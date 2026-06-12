# @byomsdk/react

React hooks and components for [Bring Your Model](https://bringyourmodel.com).

## Install

```bash
npm install @byomsdk/react @byomsdk/sdk
```

Requires React 18+ and the BYOM Wallet browser extension for end users.

## Usage

```tsx
import { useByom, ByomInstallBanner } from '@byomsdk/react';

function App() {
  const { ask, isAvailable } = useByom({
    askFallback: async (req) => {
      const res = await fetch('/api/ai', { method: 'POST', body: JSON.stringify(req) });
      return res.json();
    },
  });

  return (
    <>
      <ByomInstallBanner />
      <button onClick={() => void ask({ input: 'Hello' })}>Ask</button>
    </>
  );
}
```

See [@byomsdk/sdk](../sdk/README.md) for the core API.
