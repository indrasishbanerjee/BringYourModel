import { useCallback, useEffect, useState } from 'react';
import type { Capabilities } from '@byomsdk/sdk';
import { checkExtension } from '../examples/runners';

export function useExtensionStatus() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { available, capabilities: caps } = await checkExtension();
      setIsAvailable(available);
      setCapabilities(caps);
    } catch {
      setIsAvailable(false);
      setCapabilities(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isAvailable, capabilities, refresh };
}
