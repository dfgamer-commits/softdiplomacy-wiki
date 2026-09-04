export type CategoryScene = 'territory' | 'economy' | 'construction' | 'intercept' | 'trade' | 'landing' | 'rail' | 'network';
export type CategoryTopic = {
  slug: string;
  label: string;
  title: string;
  scene: CategoryScene;
  air?: boolean;
  steps: readonly [string, string, string];
  captions: readonly [string, string, string];
};

export const CATEGORY_TOPICS: readonly CategoryTopic[] = [
  {
    slug: 'Combat', label: 'Combat', title: 'Commit troops. Move the border.', scene: 'territory',
    steps: ['Allocate', 'Advance', 'Contest'],
    captions: ['Choose how many of your troops to commit; keep the rest in reserve.', 'The committed troops cross a shared border and fight for adjacent tiles.', 'Territory changes as the attack progresses. Terrain and defenses affect the real outcome.'],
  },
  {
    slug: 'Gold', label: 'Gold', title: 'Income becomes infrastructure.', scene: 'economy',
    steps: ['Generate', 'Trade', 'Invest'],
    captions: ['Base income adds gold over time, independently of trade.', 'A completed trade adds another payment to your gold reserve.', 'Spend that reserve on construction and upgrades. Income and spending are separate events.'],
  },
  {
    slug: 'Buildings', label: 'Buildings', title: 'A valid tile. A lasting advantage.', scene: 'construction',
    steps: ['Choose a tile', 'Construct', 'Gain capacity'],
    captions: ['Example: select a city on a valid owned land tile and pay its construction cost.', 'The structure must finish construction before it is ready.', 'A completed city raises maximum population capacity; it does not instantly fill it with troops.'],
  },
  {
    slug: 'Warship', label: 'Warship', title: 'Control water from a distance.', scene: 'intercept',
    steps: ['Approach', 'Fire in range', 'Resume patrol'],
    captions: ['A warship moves from its port toward an assigned patrol area.', 'An enemy transport enters range. The warship fires a shell instead of colliding with it.', 'A successful shell destroys the fragile transport, and the warship can return to patrol.'],
  },
  {
    slug: 'Trade_Ship', label: 'Trade ship', title: 'The voyage comes before the reward.', scene: 'trade',
    steps: ['Select a partner', 'Sail', 'Pay on arrival'],
    captions: ['An active port selects another player’s eligible port for a trade.', 'The ship follows a navigable water route. This diagram shows an uninterrupted trade.', 'On a normal completed trade, both port owners receive gold. The ship is consumed.'],
  },
  {
    slug: 'Transport_Ship', label: 'Transport ship', title: 'Carry an army across the water.', scene: 'landing',
    steps: ['Load troops', 'Cross the water', 'Land and attack'],
    captions: ['Allocate real troops from your reserve to a transport mission.', 'The unarmed transport carries its payload toward the chosen landing point.', 'Only after arrival do the troops land and begin the normal ground attack.'],
  },
  {
    slug: 'Railroad', label: 'Railroad', title: 'Connect first. Trade second.', scene: 'rail',
    steps: ['Link stations', 'Run a train', 'Reach a station'],
    captions: ['Eligible nearby buildings form a rail connection. A factory anchors this example.', 'The train follows the completed track, including its bends, rather than cutting across land.', 'The train reaches the next station. The connected network supports further rail trade.'],
  },
  {
    slug: 'Air_Units', label: 'Air units', title: 'Three missions. One air network.', scene: 'network', air: true,
    steps: ['Trade', 'Patrol', 'Insert troops'],
    captions: ['Passenger planes connect eligible airports for trade, like trade ships between ports.', 'Fighters patrol and engage hostile aircraft, carrying the warship role into the air.', 'Attack helicopters carry real troops to a land objective, like a one-way transport ship mission.'],
  },
  {
    slug: 'Airport_SoftDiplomacy', label: 'Airport', title: 'Where the air network meets the rails.', scene: 'rail', air: true,
    steps: ['Join the network', 'Receive a train', 'Complete the stop'],
    captions: ['A completed airport can join nearby rail infrastructure under the station-connection rules.', 'The train follows the connected rail line into the airport station.', 'Airport-stop payments are 80% of the corresponding port-stop payments. Existing port payouts are unchanged.'],
  },
  {
    slug: 'Passenger_Plane', label: 'Passenger plane', title: 'A curved route. A completed trade.', scene: 'trade', air: true,
    steps: ['Choose airports', 'Fly the route', 'Pay on arrival'],
    captions: ['Two active, completed airports belonging to eligible trading partners establish a flight.', 'The passenger triangle follows its curved route through the air.', 'On this uncaptured flight, both airport owners receive gold only after arrival.'],
  },
  {
    slug: 'Fighter_Jet', label: 'Fighter jet', title: 'Close to range. Fire forward.', scene: 'intercept', air: true,
    steps: ['Deploy', 'Engage', 'Resume patrol'],
    captions: ['The fighter leaves its airport for an ordered area and detects a hostile helicopter.', 'It turns red in combat and fires forward from range. The projectile depicts a gameplay shell.', 'A successful shell destroys the helicopter in one hit. The jet returns to its neutral patrol color.'],
  },
  {
    slug: 'Attack_Helicopter', label: 'Attack helicopter', title: 'The flight delivers the ground attack.', scene: 'landing', air: true,
    steps: ['Commit the payload', 'Fly to the objective', 'Deploy troops'],
    captions: ['Pay for a launch and load real troops at an active airport. Only two may be active per player.', 'The helicopter carries those troops to the objective; it does not shoot ground targets.', 'Troops descend and begin the ordinary land attack. The aircraft is consumed. The rope is an illustration, not an extra game mechanic.'],
  },
];

export const CATEGORY_MOTION_QUERY = '(min-width: 761px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';
export const CATEGORY_STEP_STOPS = [0.22, 0.56, 1] as const;
export const clampProgress = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export const categorySegment = (value: number, start: number, end: number) => {
  const p = clampProgress((value - start) / (end - start));
  return p * p * (3 - 2 * p);
};

export function categoryState(progress: number) {
  const p = clampProgress(progress);
  return {
    progress: p,
    phase: p < 0.32 ? 0 : p < 0.78 ? 1 : 2,
    prepare: categorySegment(p, 0.02, 0.28),
    action: categorySegment(p, 0.32, 0.72),
    outcome: categorySegment(p, 0.78, 0.98),
    arrival: p >= 0.72,
    shot: categorySegment(p, 0.48, 0.70),
    shotVisible: p >= 0.48 && p < 0.70,
    impact: categorySegment(p, 0.70, 0.80),
    targetVisible: p < 0.70,
    engaging: p >= 0.32 && p < 0.82,
    rope: categorySegment(p, 0.74, 0.80),
    descent: [0, 1, 2].map((index) => categorySegment(p, 0.80 + index * 0.03, 0.88 + index * 0.03)),
    groundAdvance: categorySegment(p, 0.94, 1),
  };
}

export function categoryScrollProgress(top: number, height: number, stageHeight: number, inset: number) {
  return clampProgress((inset - top) / Math.max(1, height - stageHeight));
}
