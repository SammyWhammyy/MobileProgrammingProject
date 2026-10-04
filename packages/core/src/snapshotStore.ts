import type { ScanSnapshot } from './types';

/**
 * Scanners mutate internal state at high rates (hundreds of BLE packets per second),
 * so snapshots are rebuilt on a fixed interval instead of on every event.
 */
export function createSnapshotStore(build: () => ScanSnapshot, intervalMs: number) {
  let snapshot = build();
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  const publish = () => {
    snapshot = build();
    listeners.forEach((l) => l());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish,
    start() {
      if (!timer) timer = setInterval(publish, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
