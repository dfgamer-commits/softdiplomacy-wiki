export type CameraPoint = { x: number; y: number; z: number };
export type ImmersivePose = { position: CameraPoint; target: CameraPoint; fov: number };
const safe = (n: number, fallback = 0) => Number.isFinite(n) ? n : fallback;
const bound = (n: number, min: number, max: number) => Math.min(max, Math.max(min, safe(n)));
const blend = (a: CameraPoint, b: CameraPoint, t: number): CameraPoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

// The viewpoint moves through the same space as the subjects. Nearby rails,
// tiles and route lines cross the frame faster than the distant horizon. No
// screen shake, random camera motion, fabricated cockpit or invented game data.
export function immersivePose({ kind, air, progress, subject, heading, attention, lookX = 0, lookY = 0, aspect = 1.6, calm = false }: {
  kind: string; air: boolean; progress: number; subject: CameraPoint; heading: number;
  attention: CameraPoint; lookX?: number; lookY?: number; aspect?: number; calm?: boolean;
}): ImmersivePose {
  const p = bound(progress, 0, 1), yaw = safe(heading);
  const forward = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
  const side = { x: forward.z, y: 0, z: -forward.x };
  const point = { x: safe(subject.x), y: Math.max(0.2, safe(subject.y, 0.2)), z: safe(subject.z) };
  if (calm) return { position: { x: 0, y: 17, z: 15 }, target: { x: 0, y: 0.4, z: 0 }, fov: 45 };
  const moving = ['trade', 'intercept', 'landing', 'rail', 'network'].includes(kind);
  const distance = (kind === 'rail' ? 3.9 : 4.6) * (aspect < 1 ? 1.35 : 1);
  const sideOffset = 0.85 + bound(lookX, -1, 1) * 0.7;
  let position = {
    x: point.x - forward.x * distance + side.x * sideOffset,
    y: point.y + (air ? 1.65 : 1.25) + bound(lookY, -1, 1) * 0.3,
    z: point.z - forward.z * distance + side.z * sideOffset,
  };
  let target = { x: point.x + forward.x * 1.2 + side.x * bound(lookX, -1, 1), y: point.y + 0.15 + bound(lookY, -1, 1) * 0.6, z: point.z + forward.z * 1.2 + side.z * bound(lookX, -1, 1) };
  if (!moving) {
    const a = -0.7 + p * 1.4;
    position = { x: Math.sin(a) * 9, y: 3.5 + p * 1.3, z: Math.cos(a) * 9 };
    target = blend(point, attention, p * 0.65);
  }
  // At a delivery, pull to the side to keep the payload / payment in view.
  if (kind === 'landing' || kind === 'trade') {
    const finish = bound((p - 0.8) / 0.2, 0, 1);
    const ease = finish * finish * (3 - 2 * finish);
    position = blend(position, { x: point.x - 3.8, y: Math.max(3.5, point.y + 1.2), z: point.z + 4 }, ease);
    target = blend(target, attention, ease);
  }
  position.y = Math.max(1.1, position.y);
  return { position, target, fov: kind === 'rail' ? 59 : 62 };
}

export function wheelTimeline(progress: number, delta: number, deltaMode: number) {
  const pixels = safe(delta) * (deltaMode === 1 ? 16 : deltaMode === 2 ? 500 : 1);
  return bound(safe(progress) + bound(pixels, -180, 180) / 4500, 0, 1);
}
