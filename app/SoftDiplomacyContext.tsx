/* eslint-disable @next/next/no-img-element -- these small SVGs are exact game UI assets, not page-content images */

type ContextCard = {
  label: string;
  text: string;
  href?: string;
};

type ContextEntry = {
  eyebrow: string;
  title: string;
  summary: string;
  cards: ContextCard[];
};

const contexts: Record<string, ContextEntry> = {
  Buildings: {
    eyebrow: 'Current SoftDiplomacy build system',
    title: 'The air layer is live—not planned.',
    summary:
      'SoftDiplomacy keeps every original build item and adds Airport, Fighter Jet, and Attack Helicopter. Passenger planes are automatic airport traffic, so they correctly do not appear as a purchasable card.',
    cards: [],
  },
  Controls: {
    eyebrow: 'SoftDiplomacy control update',
    title: 'Three additive air shortcuts.',
    summary:
      'The original OpenFront controls remain intact. The default air bindings add I for Airport, J for Fighter Jet, and H for Attack Helicopter.',
    cards: [
      { label: 'I', text: 'Select Airport', href: 'Airport_SoftDiplomacy' },
      { label: 'J', text: 'Select Fighter Jet', href: 'Fighter_Jet' },
      { label: 'H', text: 'Select Attack Helicopter', href: 'Attack_Helicopter' },
    ],
  },
  Gold: {
    eyebrow: 'SoftDiplomacy economy update',
    title: 'Air trade extends the economy.',
    summary:
      'Passenger planes generate gold after a valid airport-to-airport flight completes. Airport train stops pay 80% of the corresponding port-stop amount; existing port, city, ship, and train payouts are unchanged.',
    cards: [
      { label: 'Trade', text: 'Passenger-plane payout is based on route distance.', href: 'Passenger_Plane' },
      { label: 'Rail', text: 'Airport station payout is 20% below the matching port stop.', href: 'Airport_SoftDiplomacy' },
      { label: 'Parity', text: 'The base economy remains authoritative.', href: 'Base_Mechanics_Parity' },
    ],
  },
  Trade: {
    eyebrow: 'SoftDiplomacy trade update',
    title: 'Trade now has an air route.',
    summary:
      'Passenger planes are the trade-ship twin: they spawn automatically from eligible airports, fly between players who can trade, and pay gold on arrival.',
    cards: [
      { label: 'Unit', text: 'Passenger Plane', href: 'Passenger_Plane' },
      { label: 'Hub', text: 'Airport', href: 'Airport_SoftDiplomacy' },
      { label: 'Limit', text: '800 active passenger planes globally' },
    ],
  },
  Port: {
    eyebrow: 'Air counterpart',
    title: 'Ports stay unchanged; airports sit beside them.',
    summary:
      'Airport behavior is parallel to the port system. It does not replace ports or alter trade-ship spawning, port repair, naval deployment, or port train payouts.',
    cards: [
      { label: 'Port', text: 'Naval hub—original behavior preserved' },
      { label: 'Airport', text: 'Air hub—passenger, fighter, and helicopter support', href: 'Airport_SoftDiplomacy' },
      { label: 'Rule', text: 'Additive rather than disruptive', href: 'Base_Mechanics_Parity' },
    ],
  },
  Railroad: {
    eyebrow: 'SoftDiplomacy rail update',
    title: 'Airports can join the rail network.',
    summary:
      'An active airport can become a station under the same connection and range rules used by ports. Its payout is 80% of the corresponding port-stop payment.',
    cards: [
      { label: 'Connection', text: 'Same overlap and station-range rules as ports' },
      { label: 'Payout', text: '20% less than the equivalent port stop' },
      { label: 'Unchanged', text: 'Port and city station income is not reduced' },
    ],
  },
  Train: {
    eyebrow: 'SoftDiplomacy rail update',
    title: 'Trains can stop at airports.',
    summary:
      'Connected active airports are valid rail stations. A completed airport stop uses the normal train flow and pays 80% of the matching port-stop amount.',
    cards: [
      { label: 'Station', text: 'Active connected Airport', href: 'Airport_SoftDiplomacy' },
      { label: 'Income', text: '80% of the matching Port payment' },
      { label: 'Parity', text: 'Existing train destinations and logic remain intact' },
    ],
  },
  Factory: {
    eyebrow: 'SoftDiplomacy rail update',
    title: 'Factories can route trains through airports.',
    summary:
      'The factory and railroad mechanics are unchanged. SoftDiplomacy only extends the set of supported stations so an eligible airport can participate in the same network.',
    cards: [
      { label: 'Factory', text: 'Original train production and route logic' },
      { label: 'Airport', text: 'Additional valid station type', href: 'Airport_SoftDiplomacy' },
      { label: 'Port', text: 'Original station and payout preserved' },
    ],
  },
  Trade_Ship: {
    eyebrow: 'Air twin',
    title: 'Passenger planes mirror trade ships.',
    summary:
      'The passenger plane reuses the trade role with airport endpoints, air movement, a triangle marker, 20% higher travel speed, and a global active cap of 800. Trade ships themselves are unchanged.',
    cards: [
      { label: 'Naval', text: 'Trade Ship—original mechanics' },
      { label: 'Air', text: 'Passenger Plane—documented adjustments', href: 'Passenger_Plane' },
      { label: 'Visual', text: 'Triangle at trade-ship marker scale' },
    ],
  },
  Warship: {
    eyebrow: 'Air twin',
    title: 'Fighter jets mirror warships.',
    summary:
      'Fighters use the warship model for health, levels, repair, targeting, firing rhythm, and capture behavior, with the documented air movement and price adjustments. Warships themselves are unchanged.',
    cards: [
      { label: 'Naval', text: 'Warship—original mechanics' },
      { label: 'Air', text: 'Fighter Jet—documented adjustments', href: 'Fighter_Jet' },
      { label: 'Visual', text: 'Pentagon at warship/pirate-ship marker scale' },
    ],
  },
  Transport_Ship: {
    eyebrow: 'Air twin',
    title: 'Attack helicopters mirror transport ships.',
    summary:
      'A helicopter carries real troops along a visible route with an arrival warning, then is consumed after a successful insertion. It adds a paid launch and a two-active-unit limit; transport ships are unchanged.',
    cards: [
      { label: 'Naval', text: 'Transport Ship—original mechanics' },
      { label: 'Air', text: 'Attack Helicopter—documented adjustments', href: 'Attack_Helicopter' },
      { label: 'Limit', text: '2 active helicopters per player' },
    ],
  },
  Troops: {
    eyebrow: 'SoftDiplomacy troop update',
    title: 'Helicopters move real troops.',
    summary:
      'Attack helicopters reserve a real payload from the player, show the route and arrival timer, and hand that payload into normal land combat after landing. Troop generation and ordinary attacks are unchanged.',
    cards: [
      { label: 'Payload', text: 'Uses the player’s actual troop pool' },
      { label: 'Landing', text: 'Begins the existing land-combat flow' },
      { label: 'Carrier', text: 'Consumed after a successful insertion', href: 'Attack_Helicopter' },
    ],
  },
  Maps: {
    eyebrow: 'SoftDiplomacy map update',
    title: 'No map geometry is replaced.',
    summary:
      'Aircraft travel above land and water using their own routes. Existing terrain, nation boundaries, spawn rules, map pixels, and naval restrictions remain the OpenFront baseline.',
    cards: [
      { label: 'Passenger', text: 'Airport-to-airport curved air lane', href: 'Passenger_Plane' },
      { label: 'Fighter', text: 'Free air patrol and combat movement', href: 'Fighter_Jet' },
      { label: 'Helicopter', text: 'Visible insertion trail and ETA', href: 'Attack_Helicopter' },
    ],
  },
  SAM_Launcher: {
    eyebrow: 'Missile parity',
    title: 'SAM behavior remains nuclear defense only.',
    summary:
      'SoftDiplomacy does not add fighter-based missile interception and does not change the original SAM-to-nuclear-missile rules. Fighters target aircraft—not atom bombs, hydrogen bombs, or MIRVs.',
    cards: [
      { label: 'SAM', text: 'Original nuclear-defense behavior preserved' },
      { label: 'Fighter', text: 'Aircraft combat only', href: 'Fighter_Jet' },
      { label: 'Removed', text: 'No added missile-interception feature' },
    ],
  },
  Missile_Silo: {
    eyebrow: 'Missile parity',
    title: 'Air units do not alter missile launches.',
    summary:
      'Missile silo targeting, launch, ownership, and nuclear payload behavior remain the original OpenFront mechanics. Fighter jets do not intercept missiles.',
    cards: [
      { label: 'Silo', text: 'Original launch mechanics' },
      { label: 'SAM', text: 'Original nuclear-defense relationship' },
      { label: 'Fighter', text: 'No missile interception', href: 'Fighter_Jet' },
    ],
  },
  Nuke: {
    eyebrow: 'Missile parity',
    title: 'Nuclear mechanics are unchanged.',
    summary:
      'SoftDiplomacy adds aircraft without adding a new missile-interception path. Existing nuclear weapon, SAM, damage, fallout, and targeting behavior stays authoritative.',
    cards: [
      { label: 'Weapons', text: 'Original OpenFront nuclear behavior' },
      { label: 'Defense', text: 'Original SAM behavior' },
      { label: 'Air', text: 'Fighters engage aircraft only', href: 'Fighter_Jet' },
    ],
  },
};

contexts.Atom_Bomb = contexts.Nuke;
contexts.Hydrogen_Bomb = contexts.Nuke;
contexts.MIRV = contexts.Nuke;

const buildGroups = [
  {
    label: 'Infrastructure',
    items: ['City', 'Factory', 'Port', 'Airport', 'Defense Post', 'Missile Silo', 'SAM Launcher'],
  },
  {
    label: 'Forces',
    items: ['Warship', 'Fighter Jet', 'Attack Helicopter'],
  },
  {
    label: 'Bombs',
    items: ['Atom Bomb', 'MIRV', 'Hydrogen Bomb'],
  },
];

const airBuilds: Record<string, { icon: string; key: string; note: string }> = {
  Airport: {
    icon: '/images/AirportIconWhite.svg',
    key: 'I',
    note: 'Air hub',
  },
  'Fighter Jet': {
    icon: '/images/FighterPentagonIconWhite.svg',
    key: 'J',
    note: 'Air combat',
  },
  'Attack Helicopter': {
    icon: '/images/AirTransportTriangleIconWhite.svg',
    key: 'H',
    note: 'Troop insertion',
  },
};

function articleHref(slug: string) {
  return `#/article/${encodeURIComponent(slug)}`;
}

function CurrentBuildCatalog() {
  return (
    <div className="current-build-catalog">
      <div className="build-catalog-heading">
        <div>
          <span>LIVE BUILD CATALOG</span>
          <strong>Current SoftDiplomacy menu</strong>
        </div>
        <small>13 purchasable items · 3 air additions</small>
      </div>
      <div className="build-catalog-groups">
        {buildGroups.map((group) => (
          <section key={group.label}>
            <h3>{group.label}</h3>
            <div className="build-catalog-items">
              {group.items.map((item) => {
                const air = airBuilds[item];
                return (
                  <div className={air ? 'build-catalog-item is-air' : 'build-catalog-item'} key={item}>
                    {air ? (
                      <img src={air.icon} alt="" />
                    ) : (
                      <span className="base-build-mark" aria-hidden="true" />
                    )}
                    <div>
                      <strong>{item}</strong>
                      <small>{air ? air.note : 'Original OpenFront item'}</small>
                    </div>
                    {air && <kbd>{air.key}</kbd>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="automatic-air-unit">
        <span className="unit-mark unit-mark--plane" aria-hidden="true"><span /></span>
        <div>
          <strong>Passenger Plane</strong>
          <p>Automatic airport trade unit—intentionally absent from the purchase menu.</p>
        </div>
        <a href={articleHref('Passenger_Plane')}>How it spawns →</a>
      </div>
    </div>
  );
}

export function sourceNeedsReview(html: string) {
  return /article needs to be\s*<b>updated<\/b>|article is a stub/i.test(html);
}

export default function SoftDiplomacyContext({ slug }: { slug: string }) {
  const context = contexts[slug];
  if (!context) return null;

  return (
    <section className="sd-context" aria-label="Current SoftDiplomacy information">
      <header>
        <p className="eyebrow">{context.eyebrow}</p>
        <h2>{context.title}</h2>
        <p>{context.summary}</p>
      </header>
      {slug === 'Buildings' ? (
        <CurrentBuildCatalog />
      ) : (
        <div className="sd-context-grid">
          {context.cards.map((card) => {
            const content = (
              <>
                <span>{card.label}</span>
                <strong>{card.text}</strong>
                {card.href && <i aria-hidden="true">↗</i>}
              </>
            );
            return card.href ? (
              <a href={articleHref(card.href)} key={`${card.label}-${card.text}`}>{content}</a>
            ) : (
              <div key={`${card.label}-${card.text}`}>{content}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
