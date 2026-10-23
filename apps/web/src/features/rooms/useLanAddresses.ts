import { useEffect, useState } from 'react';
import { networkSchema } from '@party/contracts';

type Discovery = { status: 'loading' | 'ready' | 'error'; addresses: string[] };

export function useLanAddresses(enabled: boolean) {
  const [discovery, setDiscovery] = useState<Discovery>({ status: 'loading', addresses: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setDiscovery({ status: 'loading', addresses: [] });
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]);
    void (async () => {
      try {
        const response = await fetch('/api/network', { signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Network discovery unavailable');
        const { addresses } = networkSchema.parse(await response.json());
        if (!controller.signal.aborted) setDiscovery({ status: 'ready', addresses: [...new Set(addresses)] });
      } catch {
        if (!controller.signal.aborted) setDiscovery({ status: 'error', addresses: [] });
      }
    })();
    return () => controller.abort();
  }, [enabled, attempt]);
  return { ...discovery, retry: () => setAttempt(previous => previous + 1) };
}
