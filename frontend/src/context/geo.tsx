import { createContext, useCallback, useContext, useState, type PropsWithChildren } from "react";

import { useLocation, type Coords } from "@/src/hooks/useLocation";

type GeoState = {
  coords: Coords | null;
  denied: boolean;
  resolving: boolean;
  ensureLocation: () => Promise<Coords | null>;
  setManual: (c: Coords) => void;
};

const Ctx = createContext<GeoState | undefined>(undefined);

export function GeoProvider({ children }: PropsWithChildren) {
  const { getCurrent } = useLocation();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [denied, setDenied] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const ensureLocation = useCallback(async () => {
    if (coords) return coords;
    if (attempted) return null;
    setResolving(true);
    setAttempted(true);
    const res = await getCurrent();
    setResolving(false);
    if (res.ok) {
      setCoords(res.coords);
      setDenied(false);
      return res.coords;
    }
    setDenied(true);
    return null;
  }, [coords, attempted, getCurrent]);

  const setManual = useCallback((c: Coords) => setCoords(c), []);

  return (
    <Ctx.Provider value={{ coords, denied, resolving, ensureLocation, setManual }}>{children}</Ctx.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGeo must be used within GeoProvider");
  return ctx;
}
