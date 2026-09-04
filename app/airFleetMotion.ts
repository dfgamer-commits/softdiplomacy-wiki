export const FLEET_MOTION_QUERY =
  '(min-width: 761px) and (min-height: 740px) and (prefers-reduced-motion: no-preference)';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

// Hold each chapter while its aircraft crosses the scene. Slide between holds.
export function fleetMotion(progress: number) {
  const p = Number.isFinite(progress) ? clamp(progress) : 0;
  const chapter = ease((p - 0.28) / 0.08) + ease((p - 0.64) / 0.08);
  return {
    progress: p,
    chapter,
    active: Math.round(chapter),
    flights: [clamp(p / 0.28), clamp((p - 0.36) / 0.28), clamp((p - 0.72) / 0.28)],
  };
}

export function fleetScrollProgress(top: number, height: number, stageHeight: number, inset: number) {
  return clamp((inset - top) / Math.max(1, height - stageHeight));
}

export const FLEET_CHAPTER_STOPS = [0.14, 0.5, 0.86];
