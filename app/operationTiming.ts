import type { WorldKind, WorldState } from './operationWorld';

const span = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Topic chapters have different causes. In particular, connecting track and
// travelling on it cannot share one generic movement phase. No value is a real
// gameplay time, balance value, altitude, or troop count.
export function applyOperationTiming(kind: WorldKind, base: WorldState, progress: number, fleet: boolean): WorldState {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const state = { ...base, timeline: p, connection: base.flight, enemyApproach: fleet ? span(p, 0.04, 0.36) : span(p, 0.29, 0.52) };
  if (fleet) return state;
  if (kind === 'rail') state.flight = base.interact;
  if (kind === 'trade') {
    state.flight = span(p, 0.29, 0.85);
    state.outcome = span(p, 0.88, 0.98);
    state.carrierOpacity = 1 - span(p, 0.85, 0.88);
  }
  return state;
}
