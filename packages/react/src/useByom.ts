import { useCallback, useMemo } from 'react';
import {
  byom,
  createByomWithFallback,
  type AskRequest,
  type AskResponse,
  type CreateByomWithFallbackOptions,
} from '@byomsdk/sdk';

export interface UseByomOptions extends Omit<CreateByomWithFallbackOptions, 'client'> {}

export function useByom(options: UseByomOptions = {}) {
  const client = useMemo(() => createByomWithFallback(options), [options]);

  const ask = useCallback(
    (request: AskRequest, signal?: AbortSignal) => client.ask(request, signal),
    [client]
  );

  const isAvailable = useCallback(
    (timeoutMs?: number) => client.isAvailable(timeoutMs),
    [client]
  );

  return {
    ask,
    isAvailable,
    raw: byom,
  };
}

export type { AskRequest, AskResponse };
