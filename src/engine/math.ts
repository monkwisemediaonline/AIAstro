export const norm360 = (x: number): number => ((x % 360) + 360) % 360;

/** Boundary epsilon: a value exactly on a boundary belongs to the next division. */
const EPS = 1e-9;

export const signIndex = (lon: number): number => Math.floor((norm360(lon) + EPS) / 30) % 12;
export const degInSign = (lon: number): number => norm360(lon) - signIndex(lon) * 30;

export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

export function formatDms(x: number): string {
  const totalSec = Math.round(x * 3600);
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

/** Angular separation, 0–180. */
export const separation = (a: number, b: number): number => {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
};

/** Distance (degrees) from lon to the nearest sign boundary. */
export const distanceToSignBoundary = (lon: number): number => {
  const d = degInSign(lon);
  return Math.min(d, 30 - d);
};
