export const boundedProgress = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

// Keep playback time local to a visible frame. Returning to a background tab
// must not jump over the shot, arrival, or deployment the reader was watching.
export function advancePlayback(progress: number, elapsed: number, duration: number) {
  const delta = Number.isFinite(elapsed) ? Math.max(0, Math.min(64, elapsed)) : 0;
  const length = Number.isFinite(duration) ? Math.max(1, duration) : 14000;
  return boundedProgress(boundedProgress(progress) + delta / length);
}

// A short screen cannot pin a complete diagram and its controls. Keep the
// scene scrollable and reversible there instead of silently freezing it.
export function viewportStoryProgress(top: number, height: number, viewport: number) {
  return boundedProgress((viewport * 0.8 - top) / Math.max(1, height + viewport * 0.45));
}

export function campaignMissionProgress(progress: number) {
  const p = boundedProgress(progress);
  return [boundedProgress((p - 0.12) / 0.26), boundedProgress((p - 0.39) / 0.24), boundedProgress((p - 0.67) / 0.24)];
}
