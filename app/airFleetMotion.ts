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

export const FLEET_MISSIONS = [
  {
    title: 'Airport-to-airport trade',
    note: 'Illustrative sequence · not to scale',
    steps: ['Depart', 'Carry trade', 'Arrive', 'Earn gold'],
    captions: [
      'A passenger plane departs from its origin airport.',
      'Trade travels to a partner airport. No delivery payment yet.',
      'The plane reaches the destination and completes its route.',
      'Both airports earn gold from the completed trade.',
    ],
  },
  {
    title: 'Defend against an airborne attack',
    note: 'Missile-style effect; gameplay uses shells.',
    steps: ['Patrol', 'Acquire target', 'Fire a shell', 'Threat removed'],
    captions: [
      'An enemy helicopter approaches the fighter’s patrol area.',
      'The fighter closes to firing range, then holds its distance.',
      'A forward projectile and glowing trail show the shot. In the game, this weapon is a shell.',
      'The shell destroys the helicopter. The jet returns to patrol.',
    ],
  },
  {
    title: 'Deliver troops to the selected tile',
    note: 'Ropes illustrate delivery, not an added mechanic.',
    steps: ['Load troops', 'Fly to target', 'Deploy troops', 'Ground attack'],
    captions: [
      'The paid launch commits real troops from the player’s army.',
      'The helicopter carries those troops along its visible route.',
      'The helicopter holds over the tile as troops descend on a rope—an illustration of deployment.',
      'The aircraft is consumed. Its troops begin a normal ground attack; victory is not automatic.',
    ],
  },
];

// Pure, reversible scene state: outcomes never precede the action causing them.
// Progress represents an illustrative mission, not real game seconds or range.
export function fleetMission(index: number, progress: number) {
  const p = Number.isFinite(progress) ? clamp(progress) : 0;
  const isFighter = index === 1;
  const isHelicopter = index === 2;
  const flight = isFighter ? ease((p - 0.08) / 0.32) : clamp((p - 0.1) / (isHelicopter ? 0.5 : 0.7));
  const arrival = isFighter ? 0 : isHelicopter ? ease((p - 0.91) / 0.05) : ease((p - 0.82) / 0.1);
  const projectile = isFighter ? clamp((p - 0.52) / 0.18) : 0;
  const impact = isFighter ? clamp((p - 0.7) / 0.12) : 0;
  const phase = isFighter
    ? p < 0.4 ? 0 : p < 0.52 ? 1 : p < 0.82 ? 2 : 3
    : isHelicopter ? p < 0.1 ? 0 : p < 0.6 ? 1 : p < 0.96 ? 2 : 3
    : p < 0.1 ? 0 : p < 0.8 ? 1 : p < 0.92 ? 2 : 3;
  return {
    flight, phase, arrival, projectile, impact,
    enemyFlight: isFighter ? ease((p - 0.04) / 0.32) : 0,
    inCombat: isFighter && p >= 0.4 && p < 0.82,
    aircraftOpacity: isFighter ? 1 : 1 - arrival,
    targetOpacity: isFighter ? 1 - ease((p - 0.7) / 0.06) : 0,
    projectileOpacity: isFighter && p >= 0.52 && p < 0.7 ? 1 : 0,
    muzzleOpacity: isFighter && p >= 0.52 && p < 0.56 ? 1 - clamp((p - 0.52) / 0.04) : 0,
    impactOpacity: isFighter && p >= 0.7 && p < 0.82 ? Math.sin(impact * Math.PI) : 0,
    goldOpacity: index === 0 ? ease((p - 0.92) / 0.06) : 0,
    troopsOpacity: isHelicopter ? ease((p - 0.96) / 0.04) : 0,
    ropeLength: isHelicopter ? ease((p - 0.62) / 0.06) : 0,
    ropeOpacity: isHelicopter && p >= 0.62 ? 1 - ease((p - 0.91) / 0.05) : 0,
    rappellers: [0.7, 0.74, 0.78].map((start) => ({
      descent: isHelicopter ? ease((p - start) / 0.13) : 0,
      opacity: isHelicopter && p >= start ? 1 : 0,
    })),
  };
}
