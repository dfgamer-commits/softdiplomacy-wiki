export type CategoryScene = 'territory' | 'economy' | 'construction' | 'intercept' | 'trade' | 'landing' | 'rail' | 'network';
export type CategoryTopic = {
  slug: string;
  label: string;
  title: string;
  scene: CategoryScene;
  air?: boolean;
  steps: readonly [string, string, string, string];
  captions: readonly [string, string, string, string];
  readouts: readonly [readonly [string, string], readonly [string, string], readonly [string, string], readonly [string, string]];
  principle: string;
};

export const CATEGORY_TOPICS: readonly CategoryTopic[] = [
  {
    slug: 'Combat', label: 'Combat', title: 'Commit troops. Move the border.', scene: 'territory',
    steps: ['Set the ratio', 'Commit troops', 'Meet resistance', 'Move the border'],
    captions: ['Choose the share of your available troops to attack with. A lower ratio preserves more defense at home.', 'Committed troops leave your reserve immediately and advance only through territory that borders your own.', 'Attackers and defenders exchange losses. Terrain, defense posts, troop ratio, and player state alter the calculation.', 'Tiles change owner only as the attack succeeds. Conquest is the result of sustained pressure, not the click itself.'],
    readouts: [['Input', 'Chosen attack ratio'], ['Commitment', 'Troops leave reserve'], ['Resistance', 'Terrain + defenses'], ['Result', 'Front line advances']],
    principle: 'Every offensive decision weakens your reserve. The animation keeps the cost visible while the border moves.',
  },
  {
    slug: 'Gold', label: 'Gold', title: 'Income becomes infrastructure.', scene: 'economy',
    steps: ['Generate', 'Complete trade', 'Choose a purchase', 'Invest'],
    captions: ['Base income enters the reserve over time, even when no trade is completing.', 'A trade adds its reward only after the ship or plane reaches the destination. Travel is not income yet.', 'A purchase is a separate choice. Its current price and your balance decide whether the order can begin.', 'Gold leaves the reserve when construction is accepted. The finished asset then creates strategic value.'],
    readouts: [['Source', 'Passive income'], ['Bonus', 'Completed trade'], ['Decision', 'Price versus balance'], ['Result', 'Infrastructure funded']],
    principle: 'Gold is a chain of delayed choices: earn, protect delivery, decide, then spend. Movement alone never pays.',
  },
  {
    slug: 'Buildings', label: 'Buildings', title: 'A valid tile. A lasting advantage.', scene: 'construction',
    steps: ['Validate the tile', 'Pay the price', 'Construct', 'Activate'],
    captions: ['Example: a city order first checks that the selected location is valid owned land.', 'An accepted order deducts its current gold price. Selecting a location is not the same as completing a building.', 'The structure rises through its construction state and is not treated as fully operational beforehand.', 'When complete, this city raises maximum population capacity. It does not instantly create the troops that fill it.'],
    readouts: [['Gate', 'Valid owned tile'], ['Cost', 'Gold committed'], ['Process', 'Construction progress'], ['Effect', 'Population capacity']],
    principle: 'Buildings convert money and a valid location into future capability; their benefit begins after construction.',
  },
  {
    slug: 'Warship', label: 'Warship', title: 'Control water from a distance.', scene: 'intercept',
    steps: ['Leave port', 'Acquire a target', 'Fire from range', 'Return to patrol'],
    captions: ['The warship begins at a friendly port and moves toward the patrol area selected by its owner.', 'Automatic targeting checks valid enemies in priority order. This example locks onto a fragile enemy transport.', 'The ship stops at firing range and launches a shell. It does not need to collide with the target.', 'A successful hit destroys the one-HP transport. With the threat gone, the warship resumes its assigned patrol.'],
    readouts: [['Support', 'Friendly port'], ['Sensor', 'Valid target in range'], ['Engagement', 'Shell, not collision'], ['Recovery', 'Resume patrol']],
    principle: 'A warship controls an area by preserving distance: detect, shoot, confirm the result, then return to its order.',
  },
  {
    slug: 'Trade_Ship', label: 'Trade ship', title: 'The voyage comes before the reward.', scene: 'trade',
    steps: ['Validate trade', 'Select a route', 'Survive the voyage', 'Pay on arrival'],
    captions: ['The source port needs an eligible destination owned by another player with whom it can trade.', 'The ship receives a navigable water path. Closer and allied ports influence which eligible partner is chosen.', 'The voyage creates exposure: piracy, diplomacy changes, destroyed ports, or an invalid path can prevent normal completion.', 'This uninterrupted ship reaches its destination, disappears, and pays both port owners the completed-trade reward.'],
    readouts: [['Gate', 'Eligible trade partner'], ['Plan', 'Navigable water path'], ['Risk', 'Piracy + invalidation'], ['Result', 'Both owners paid']],
    principle: 'The route is not decorative: it is the interval during which a promised payment can still be lost or redirected.',
  },
  {
    slug: 'Transport_Ship', label: 'Transport ship', title: 'Carry an army across the water.', scene: 'landing',
    steps: ['Choose a payload', 'Launch', 'Reach the coast', 'Begin the attack'],
    captions: ['Choose a real troop payload. Those troops become the mission’s cargo rather than remaining in your defensive reserve.', 'The unarmed transport leaves owned land and follows its water route toward the selected coast.', 'Until the ship reaches land, the payload remains in transit and cannot capture the destination.', 'Arrival hands the carried troops to the ordinary ground-attack system. The transport’s job ends at delivery.'],
    readouts: [['Input', 'Real troops'], ['Transit', 'Unarmed carrier'], ['Condition', 'Arrival required'], ['Handoff', 'Normal land combat']],
    principle: 'The transport is a bridge between systems: naval travel first, ordinary territorial combat only after landing.',
  },
  {
    slug: 'Railroad', label: 'Railroad', title: 'Connect first. Trade second.', scene: 'rail',
    steps: ['Check stations', 'Lay the connection', 'Run on the rails', 'Complete the stop'],
    captions: ['The system first checks eligible station types and connection distance. A factory anchors this example.', 'A valid pair creates a rail segment. Further eligible buildings can extend the network into a mesh or loop.', 'The train follows the completed track and every bend; it cannot take a straight shortcut across the map.', 'Reaching the next station completes this leg and allows the connected network to continue its trade cycle.'],
    readouts: [['Gate', 'Eligible nearby stations'], ['Network', 'Rail segment created'], ['Constraint', 'Train stays on track'], ['Result', 'Station reached']],
    principle: 'The rails are the rule, not a visual trail. Network shape decides exactly where a train can move.',
  },
  {
    slug: 'Air_Units', label: 'Air units', title: 'Three missions. One air network.', scene: 'network', air: true,
    steps: ['Start with naval roles', 'Add airport support', 'Apply air adjustments', 'Preserve the base loop'],
    captions: ['Each aircraft begins with a proven naval role: trade ship, warship, or transport ship.', 'Air trade, launch, fighter repair, and troop insertion depend on active airports instead of ports.', 'Aircraft travel over terrain and use their documented speed, cost, capacity, targeting, and visual adjustments.', 'The new layer adds routes and choices beside the naval systems without rewriting OpenFront’s land, economy, or diplomacy loop.'],
    readouts: [['Foundation', 'Three naval twins'], ['Support', 'Active airports'], ['Difference', 'Air movement + tuning'], ['Result', 'Additive expansion']],
    principle: 'Parity makes the air layer learnable: familiar jobs remain recognizable while their air-only differences stay explicit.',
  },
  {
    slug: 'Airport_SoftDiplomacy', label: 'Airport', title: 'Where the air network meets the rails.', scene: 'rail', air: true,
    steps: ['Finish the airport', 'Join the rails', 'Receive the train', 'Apply the air adjustment'],
    captions: ['Only an active, completed airport can provide its operational air and support functions.', 'Within the station rules, it can snap to nearby railroad infrastructure and become part of the network.', 'A train reaches it by following that completed track, exactly as the path on the map is drawn.', 'The airport stop pays exactly 80% of the corresponding port-stop payment. Port and city payouts remain unchanged.'],
    readouts: [['State', 'Active + completed'], ['Connection', 'Rail station rules'], ['Movement', 'Track-bound train'], ['Adjustment', '80% of port payout']],
    principle: 'The airport joins an existing economy without weakening it: the reduced airport payout is local to that stop.',
  },
  {
    slug: 'Passenger_Plane', label: 'Passenger plane', title: 'A curved route. A completed trade.', scene: 'trade', air: true,
    steps: ['Validate airports', 'Plan a local curve', 'Protect the flight', 'Pay on arrival'],
    captions: ['Two active, completed airports owned by eligible trading partners are required before a plane is scheduled.', 'A deterministic local planner gives the triangle a curved route and offsets nearby traffic for readability.', 'During flight, hijacking, ownership changes, invalid airports, and trade changes can redirect or end the mission.', 'This uncaptured plane reaches the partner airport, disappears, and pays both airport owners. No arrival means no normal payout.'],
    readouts: [['Gate', 'Eligible active airports'], ['Plan', 'Deterministic curved lane'], ['Risk', 'Hijack + invalidation'], ['Result', 'Both owners paid']],
    principle: 'Air trade rewards a completed connection. The curve explains the journey and keeps dense traffic readable.',
  },
  {
    slug: 'Fighter_Jet', label: 'Fighter jet', title: 'Close to range. Fire forward.', scene: 'intercept', air: true,
    steps: ['Deploy from support', 'Detect a valid threat', 'Stop and fire', 'Patrol or repair'],
    captions: ['A fighter launches from the nearest active owned airport and keeps the clicked position as its patrol center.', 'It validates hostile aircraft while travelling or patrolling. This example acquires an enemy attack helicopter.', 'The jet turns red, stops at warship-equivalent range, and fires a gameplay shell forward instead of colliding or circling.', 'One successful shell destroys the helicopter. The jet returns to neutral patrol behavior, or retreats to an airport when repair is needed.'],
    readouts: [['Support', 'Active owned airport'], ['Targeting', 'Valid hostile aircraft'], ['Engagement', 'Stop + shell fire'], ['Recovery', 'Patrol or airport repair']],
    principle: 'The fighter projects control without physical contact: target validation and range prevent endless collision behavior.',
  },
  {
    slug: 'Attack_Helicopter', label: 'Attack helicopter', title: 'The flight delivers the ground attack.', scene: 'landing', air: true,
    steps: ['Commit the payload', 'Track the mission', 'Reach the objective', 'Hand off to combat'],
    captions: ['Pay the lifetime-scaled launch cost and load real troops at an active airport. A player may have only two active helicopters.', 'The triangle follows a visible route with an ETA for both sides. It has no weapon for attacking the ground.', 'On a valid arrival, the carried troops descend into the selected tile. Enemy fighters may intercept the carrier before this point.', 'The payload enters ordinary land combat and the helicopter is consumed. The rope only illustrates the handoff; it adds no mechanic.'],
    readouts: [['Commitment', 'Gold + real troops'], ['Warning', 'Trail + ETA'], ['Risk', 'Fighter interception'], ['Handoff', 'Normal land combat']],
    principle: 'A helicopter buys access, not a second combat engine: it exposes committed troops in transit, then hands them to land rules.',
  },
];

export const CATEGORY_MOTION_QUERY = '(min-width: 761px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';
export const CATEGORY_STEP_STOPS = [0.14, 0.40, 0.68, 1] as const;
export const clampProgress = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export const categorySegment = (value: number, start: number, end: number) => {
  const p = clampProgress((value - start) / (end - start));
  return p * p * (3 - 2 * p);
};

export function categoryState(progress: number) {
  const p = clampProgress(progress);
  return {
    progress: p,
    phase: p < 0.27 ? 0 : p < 0.55 ? 1 : p < 0.81 ? 2 : 3,
    prepare: categorySegment(p, 0.02, 0.23),
    action: categorySegment(p, 0.29, 0.52),
    interaction: categorySegment(p, 0.57, 0.77),
    outcome: categorySegment(p, 0.82, 0.98),
    arrival: p >= 0.77,
    carrierAtObjective: p >= 0.57,
    shot: categorySegment(p, 0.61, 0.73),
    shotVisible: p >= 0.61 && p < 0.73,
    impact: categorySegment(p, 0.73, 0.82),
    targetVisible: p < 0.73,
    engaging: p >= 0.55 && p < 0.84,
    rope: categorySegment(p, 0.60, 0.66),
    descent: [0, 1, 2].map((index) => categorySegment(p, 0.68 + index * 0.03, 0.77 + index * 0.03)),
    groundAdvance: categorySegment(p, 0.88, 0.98),
  };
}

export function categoryScrollProgress(top: number, height: number, stageHeight: number, inset: number) {
  return clampProgress((inset - top) / Math.max(1, height - stageHeight));
}
