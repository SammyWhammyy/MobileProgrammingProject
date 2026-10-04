import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { createScanner } from './createScanner';
import type { ScanSnapshot, Scanner, ScannerMode } from './types';

const ScannerContext = createContext<Scanner | null>(null);

/** Creates the scanner once, starts it on mount and stops it on unmount. */
export function ScannerProvider({ mode, children }: { mode?: ScannerMode; children: ReactNode }) {
  const [scanner] = useState(() => createScanner(mode));

  useEffect(() => {
    scanner.start();
    return () => scanner.stop();
  }, [scanner]);

  return <ScannerContext.Provider value={scanner}>{children}</ScannerContext.Provider>;
}

export function useScanner(): Scanner {
  const scanner = useContext(ScannerContext);
  if (!scanner) throw new Error('useScanner must be used inside <ScannerProvider>');
  return scanner;
}

export function useScanSnapshot(): ScanSnapshot {
  const scanner = useScanner();
  return useSyncExternalStore(scanner.subscribe, scanner.getSnapshot);
}
