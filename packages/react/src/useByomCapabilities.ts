import { useEffect, useState } from 'react';
import { byom, type Capabilities } from '@byomsdk/sdk';

export interface UseByomCapabilitiesResult {
  isAvailable: boolean | null;
  capabilities: Capabilities | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useByomCapabilities(timeoutMs = 2000): UseByomCapabilitiesResult {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const available = await byom.isAvailable({ timeoutMs });
      setIsAvailable(available);
      setCapabilities(available ? await byom.getCapabilities(timeoutMs) : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [timeoutMs]);

  return { isAvailable, capabilities, loading, refresh };
}
