export type WikiCitation = readonly [slug: string, section: string];
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
  wikiSources?: readonly [WikiCitation, WikiCitation, WikiCitation, WikiCitation];
  principleSource?: WikiCitation;
};

export const CATEGORY_TOPICS: readonly CategoryTopic[] = [
  {
    "slug": "Combat",
    "label": "Combat",
    "title": "Commit troops. Move the border.",
    "scene": "territory",
    "steps": [
      "Set the ratio",
      "Commit troops",
      "Meet resistance",
      "Gain territory"
    ],
    "captions": [
      "Players may decide how many troops they will send into combat with the Attack Ratio slider at the bottom left of the UI.",
      "Once an attack is launched, the number of attacking troops is immediately removed from the player's total troop count, usually changing the troop gain rate.",
      "The attack speed and attack efficiency (how many troops are lost on each side) depends on many factors, namely:",
      "Combat is Openfront's main mechanic, allowing players, Bots , and Nations to spend Troops and time in order to gain territory."
    ],
    "readouts": [
      [
        "Input",
        "Attack ratio"
      ],
      [
        "Commitment",
        "Troops leave reserve"
      ],
      [
        "Resistance",
        "Terrain + defense posts"
      ],
      [
        "Objective",
        "Territory"
      ]
    ],
    "principle": "By clicking on a territory you are already attacking, you may add more troops into the same attack.",
    "wikiSources": [
      [
        "Combat",
        "Ground_combat"
      ],
      [
        "Combat",
        "Ground_combat"
      ],
      [
        "Combat",
        "Ground_combat"
      ],
      [
        "Combat",
        ""
      ]
    ],
    "principleSource": [
      "Combat",
      "Ground_combat"
    ]
  },
  {
    "slug": "Gold",
    "label": "Gold",
    "title": "Income becomes infrastructure.",
    "scene": "economy",
    "steps": [
      "Generate",
      "Complete trade",
      "Choose a purchase",
      "Build"
    ],
    "captions": [
      "The player slowly generates gold over time at a flat rate.",
      "Both the source and destination port owners receive the full amount.",
      "Gold is used to build structures/units :",
      "The City building increases a nation's population capacity/limit."
    ],
    "readouts": [
      [
        "Source",
        "Gold over time"
      ],
      [
        "Trade",
        "Both port owners"
      ],
      [
        "Use",
        "Structures / units"
      ],
      [
        "Example",
        "City capacity"
      ]
    ],
    "principle": "Additional gold sources are: Conquering players, bots, and nations Donations Trading (Ports, Factories)",
    "wikiSources": [
      [
        "Gold",
        ""
      ],
      [
        "Trade_Ship",
        "Gold_Generation"
      ],
      [
        "Gold",
        ""
      ],
      [
        "City",
        ""
      ]
    ],
    "principleSource": [
      "Gold",
      "Additional_Gold_Sources"
    ]
  },
  {
    "slug": "Buildings",
    "label": "Buildings",
    "title": "Choose a building. Give it a place.",
    "scene": "construction",
    "steps": [
      "Choose",
      "Find a site",
      "Spend gold",
      "Gain capacity"
    ],
    "captions": [
      "Buildings are build-able items that can be built on individual pixels on the game maps.",
      "Some buildings have specific requirements that limit where they can be built. For example, ports must be built near water.",
      "The first city costs 125,000 gold , 250,000 for the second, 500,000 for the third, and then 1,000,000 gold for every city after that.",
      "The City building increases a nation's population capacity/limit."
    ],
    "readouts": [
      [
        "Choice",
        "Building type"
      ],
      [
        "Location",
        "Placement requirements"
      ],
      [
        "Example cost",
        "City"
      ],
      [
        "Example effect",
        "Population capacity"
      ]
    ],
    "principle": "Like other buildings , cities can be captured by other nations when a nation annexes the land the city is on.",
    "wikiSources": [
      [
        "Buildings",
        "Description"
      ],
      [
        "Buildings",
        "Description"
      ],
      [
        "City",
        "Details"
      ],
      [
        "City",
        ""
      ]
    ],
    "principleSource": [
      "City",
      "Details"
    ]
  },
  {
    "slug": "Warship",
    "label": "Warship",
    "title": "Patrol. Engage. Return.",
    "scene": "intercept",
    "steps": [
      "Leave port",
      "Detect a target",
      "Fire shells",
      "Return to patrol"
    ],
    "captions": [
      "It will then appear at the nearest owned Port and will move to the targeted location.",
      "Automatically engage enemy ships that enter their targeting range",
      "While fighting, Warships will fire bullets at the target until it is destroyed.",
      "Return to patrol when targets are eliminated"
    ],
    "readouts": [
      [
        "Launch",
        "Nearest owned port"
      ],
      [
        "Detection",
        "Targeting range"
      ],
      [
        "Weapon",
        "Shells"
      ],
      [
        "After combat",
        "Patrol"
      ]
    ],
    "principle": "A warship automatically retreats to repair when it drops below 75% of its (veterancy-adjusted) maximum health.",
    "wikiSources": [
      [
        "Warship",
        "How_to_Spawn"
      ],
      [
        "Warship",
        "Patrol"
      ],
      [
        "Warship",
        "Fight"
      ],
      [
        "Warship",
        "Patrol"
      ]
    ],
    "principleSource": [
      "Warship",
      "Docked_repair"
    ]
  },
  {
    "slug": "Trade_Ship",
    "label": "Trade ship",
    "title": "The voyage comes before the reward.",
    "scene": "trade",
    "steps": [
      "Spawn",
      "Follow the route",
      "Face piracy",
      "Complete trade"
    ],
    "captions": [
      "The Trade Ship is a type of boat that automatically spawns from Ports .",
      "Trade ships automatically path to their destination port .",
      "Warships cannot capture trade ships that are marked as \"safe from pirates\".",
      "Both the source and destination port owners receive the full amount."
    ],
    "readouts": [
      [
        "Origin",
        "Port"
      ],
      [
        "Destination",
        "Another nation's port"
      ],
      [
        "Protection",
        "Near shoreline"
      ],
      [
        "Reward",
        "Both owners"
      ]
    ],
    "principle": "Players must be able to trade with each other for trade ships to spawn.",
    "wikiSources": [
      [
        "Trade_Ship",
        ""
      ],
      [
        "Trade_Ship",
        "Trade_Ship_Behavior"
      ],
      [
        "Trade_Ship",
        "Piracy_Protection"
      ],
      [
        "Trade_Ship",
        "Gold_Generation"
      ]
    ],
    "principleSource": [
      "Trade_Ship",
      "Trade_Relationships"
    ]
  },
  {
    "slug": "Transport_Ship",
    "label": "Transport ship",
    "title": "Carry troops to another shore.",
    "scene": "landing",
    "steps": [
      "Load troops",
      "Launch",
      "Cross the water",
      "Release troops"
    ],
    "captions": [
      "Transport Ships are a type of boat that contains a defined number of troops.",
      "It will appear on your nearest claimed terrain and will travel to the targeted zone.",
      "They have no weaponry and are pretty weak.",
      "Once arrived, the Transport Ship will release all the troops it contains on the zone and will capture it."
    ],
    "readouts": [
      [
        "Payload",
        "Troops"
      ],
      [
        "Origin",
        "Nearest claimed terrain"
      ],
      [
        "Weaponry",
        "None"
      ],
      [
        "Arrival",
        "Release and capture"
      ]
    ],
    "principle": "In terms of appearance, they have a dark outline with a bright center and leave a trail behind them.",
    "wikiSources": [
      [
        "Transport_Ship",
        "Description"
      ],
      [
        "Transport_Ship",
        "How_to_Spawn"
      ],
      [
        "Transport_Ship",
        "Description"
      ],
      [
        "Transport_Ship",
        "How_to_Spawn"
      ]
    ],
    "principleSource": [
      "Transport_Ship",
      "Description"
    ]
  },
  {
    "slug": "Railroad",
    "label": "Railroad",
    "title": "Connect buildings. Follow the rails.",
    "scene": "rail",
    "steps": [
      "Place buildings",
      "Connect",
      "Run the train",
      "Extend the network"
    ],
    "captions": [
      "When a factory and a city or port are placed near eachother, railroads will be spawned to connect the buildings together.",
      "Adding further buildings within this distance will cause more rail to be spawned, creating a mesh.",
      "Trains may only travel where a Railroad exists.",
      "It is also possible to make a train loop."
    ],
    "readouts": [
      [
        "Stations",
        "Factory / city / port"
      ],
      [
        "Connection",
        "Nearby buildings"
      ],
      [
        "Movement",
        "Existing rails only"
      ],
      [
        "Network",
        "Mesh or loop"
      ]
    ],
    "principle": "The maximum distance within which a factory , city or port can connect to another station to form a railroad is 80.",
    "wikiSources": [
      [
        "Railroad",
        ""
      ],
      [
        "Railroad",
        ""
      ],
      [
        "Railroad",
        ""
      ],
      [
        "Railroad",
        ""
      ]
    ],
    "principleSource": [
      "Railroad",
      ""
    ]
  },
  {
    slug: 'Air_Units', label: 'Air units', title: 'Three missions. One air network.', scene: 'network', air: true,
    steps: ['Start with naval roles', 'Add airport support', 'Apply air adjustments', 'Explore the air roles'],
    captions: ['Each aircraft is modeled on a naval role: trade ship, warship, or transport ship.', 'Air trade, launch, fighter repair, and troop insertion depend on active airports.', 'Aircraft travel over terrain and use their documented speed, cost, capacity, targeting, and visual adjustments.', 'Read the individual air articles for the trade, patrol, and troop-insertion rules and their documented differences.'],
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
    slug: 'Fighter_Jet', label: 'Fighter jet', title: 'Engage in range. Fire a shell.', scene: 'intercept', air: true,
    steps: ['Deploy from support', 'Detect a valid threat', 'Fire a shell', 'Patrol or repair'],
    captions: ['A fighter launches from the nearest active owned airport and keeps the clicked position as its patrol center.', 'It validates hostile aircraft while travelling or patrolling. This example acquires an enemy attack helicopter.', 'The jet turns red while engaging and fires gameplay shells at targets within range. The scene pauses the jet to make the shot readable.', 'One successful shell destroys the helicopter. The jet returns to neutral patrol behavior, or retreats to an airport when repair is needed.'],
    readouts: [['Support', 'Active owned airport'], ['Targeting', 'Valid hostile aircraft'], ['Engagement', 'Shell fire'], ['Recovery', 'Patrol or airport repair']],
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
