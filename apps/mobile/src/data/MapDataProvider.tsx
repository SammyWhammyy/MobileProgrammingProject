import { buildingC, type MapBundle } from '@campus/map';
import { createContext, useContext, type ReactNode } from 'react';

const MapDataContext = createContext<MapBundle | null>(null);

/** Stable UI boundary; persistence can change without changing map components. */
export function MapDataProvider({ children }: { children: ReactNode }) {
  return <MapDataContext.Provider value={buildingC}>{children}</MapDataContext.Provider>;
}

/** Returns the active local map bundle. */
export function useMapBundle(): MapBundle {
  const bundle = useContext(MapDataContext);
  if (!bundle) throw new Error('MapDataProvider is missing');
  return bundle;
}
