// Tiny pub/sub to hand a map-picked location back to the Report screen.
export type PickedLocation = { latitude: number; longitude: number; name?: string };

let current: PickedLocation | null = null;
const subs = new Set<(v: PickedLocation) => void>();

export function setPickedLocation(v: PickedLocation) {
  current = v;
  subs.forEach((f) => f(v));
}

export function getPickedLocation() {
  return current;
}

export function subscribePickedLocation(fn: (v: PickedLocation) => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
