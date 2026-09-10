const boundedProgress = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

// Every visual is a function of the timeline: rewinding removes consequences.
export function shockwave(progress: number, index = 0) {
  const p = boundedProgress(progress);
  const local = boundedProgress((p - index * 0.08) / (1 - index * 0.08));
  return { radius: 8 + local * (65 - index * 8), opacity: p > 0 && p < 1 ? Math.sin(local * Math.PI) * (1 - index * 0.16) : 0 };
}

export function impactFragment(progress: number, index: number) {
  const p = boundedProgress(progress);
  const angle = (index * 137.508 + 19) * Math.PI / 180;
  const radius = (12 + p * (44 + index % 4 * 11));
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, angle: angle * 180 / Math.PI, opacity: p > 0 && p < 1 ? (1 - p) * Math.sin(Math.min(1, p * 6) * Math.PI / 2) : 0 };
}

export function pathTailDistances(length: number, progress: number, count = 12, span = 100) {
  const end = Math.max(0, length) * boundedProgress(progress);
  return Array.from({ length: count }, (_, index) => Math.max(0, end - (index + 1) * span / count));
}

export function sceneEnvelope(progress: number, start: number, end: number) {
  const p = boundedProgress((progress - start) / Math.max(0.0001, end - start));
  return Math.sin(p * Math.PI);
}
