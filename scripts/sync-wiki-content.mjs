import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const contentRoot = path.join(projectRoot, 'public', 'content');
const pagesRoot = path.join(contentRoot, 'pages');
const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const sourcePath = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined;
const auditIndex = args.indexOf('--audit');
const auditedRevision = auditIndex >= 0 ? args[auditIndex + 1] : 'unknown';

async function loadOfficialPages() {
  if (sourcePath) {
    return JSON.parse(await readFile(path.resolve(sourcePath), 'utf8'));
  }
  const response = await fetch(
    'https://raw.githubusercontent.com/openfrontio/wiki/main/src/data/pages.json',
  );
  if (!response.ok) {
    throw new Error(`Failed to download official wiki data: ${response.status}`);
  }
  return response.json();
}

function cleanHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"')
    .trim();
}

function page(slug, title, summary, headings, html) {
  return {
    slug,
    title,
    summary,
    cats: ['SoftDiplomacy', 'Air expansion'],
    headings,
    html,
    softDiplomacy: true,
  };
}

const customPages = [
  page(
    'SoftDiplomacy',
    'SoftDiplomacy',
    'What SoftDiplomacy adds to OpenFront and what it deliberately preserves.',
    [
      { id: 'What_changes', text: 'What changes', level: 2 },
      { id: 'What_stays_the_same', text: 'What stays the same', level: 2 },
      { id: 'Update_policy', text: 'Update policy', level: 2 },
    ],
    `<p><strong>SoftDiplomacy</strong> is an OpenFront modification focused on an additive air layer. Its goal is to make airports and aircraft feel native to OpenFront while leaving the proven land, sea, economy, diplomacy, and interface mechanics intact.</p>
    <div class="sd-notice"><strong>Core rule:</strong> if a behavior already exists in OpenFront, the original implementation remains authoritative. Air units reuse the closest naval behavior with only the differences documented in this wiki.</div>
    <h2 id="What_changes">What changes</h2>
    <ul><li>Airports provide civilian air trade, fighter deployment, helicopter deployment, upgrades, healing support, and railroad connections.</li><li>Passenger planes extend trade into the air.</li><li>Fighter jets extend warship-style combat and piracy into the air.</li><li>Attack helicopters extend transport-ship troop delivery into the air.</li></ul>
    <h2 id="What_stays_the_same">What stays the same</h2>
    <p>OpenFront’s existing combat, diplomacy, territory, buildings, ports, ships, trains, nuclear weapons, bots, controls, and economy remain the baseline. Air additions are kept behind their own unit types, executions, rendering, and parity tests.</p>
    <h2 id="Update_policy">Update policy</h2>
    <p>The official OpenFront repository and community wiki are checked every 36 hours. Compatible upstream fixes are reviewed, tests and production builds are run, and this wiki records the air-specific behavior.</p>`,
  ),
  page(
    'Air_Units',
    'Air Units',
    'Overview of passenger planes, fighter jets, attack helicopters, and their naval twins.',
    [
      { id: 'Unit_roles', text: 'Unit roles', level: 2 },
      { id: 'Shared_rules', text: 'Shared rules', level: 2 },
      { id: 'Visual_language', text: 'Visual language', level: 2 },
    ],
    `<p>SoftDiplomacy’s air layer is built around <strong>naval parity</strong>. Every aircraft has a water-unit twin, so its role is familiar before the first flight.</p>
    <h2 id="Unit_roles">Unit roles</h2>
    <table class="sd-unit-table"><thead><tr><th>Air unit</th><th>Naval twin</th><th>Purpose</th><th>Speed</th></tr></thead><tbody><tr><td><a href="/Passenger_Plane">Passenger plane</a></td><td><a href="/Trade_Ship">Trade ship</a></td><td>Automatic trade income</td><td>120%</td></tr><tr><td><a href="/Fighter_Jet">Fighter jet</a></td><td><a href="/Warship">Warship</a></td><td>Patrol, combat, interception, hijacking</td><td>120%</td></tr><tr><td><a href="/Attack_Helicopter">Attack helicopter</a></td><td><a href="/Transport_Ship">Transport ship</a></td><td>One-time troop insertion</td><td>120%</td></tr></tbody></table>
    <h2 id="Shared_rules">Shared rules</h2><ul><li>Air units travel over terrain rather than being restricted to water.</li><li>Air trade requires valid airports and trade relations.</li><li>Fighter jets use warship health, levels, targeting range, firing rhythm, capture progression, and repair behavior.</li><li>Attack helicopters carry real troops and are consumed after a successful insertion.</li></ul>
    <h2 id="Visual_language">Visual language</h2><p>Passenger planes use a compact triangle the size of a trade-ship marker. Fighter jets use a compact pentagon the size of a warship/pirate-ship marker. Attack helicopters use the same triangle language as passenger planes, plus the visible mission trail and ETA behavior associated with transport ships.</p>`,
  ),
  page(
    'Airport_SoftDiplomacy',
    'Airport',
    'The air hub for trade planes, fighter jets, helicopters, healing, upgrades, and rail income.',
    [
      { id: 'Construction', text: 'Construction', level: 2 },
      { id: 'Air_trade', text: 'Air trade', level: 2 },
      { id: 'Railroads', text: 'Railroads', level: 2 },
      { id: 'Levels_and_repair', text: 'Levels and repair', level: 2 },
    ],
    `<p>The <strong>Airport</strong> is SoftDiplomacy’s air equivalent of the <a href="/Port">Port</a>. It creates passenger-plane routes, launches military aircraft, supports fighter repair, upgrades through levels, and can join a railroad network.</p>
    <div class="sd-spec-grid"><div class="sd-spec"><span>Base cost</span><strong>2.5M gold</strong></div><div class="sd-spec"><span>Build time</span><strong>5 seconds</strong></div><div class="sd-spec"><span>Rail stop value</span><strong>80% of Port</strong></div><div class="sd-spec"><span>Upgradeable</span><strong>Yes</strong></div></div>
    <h2 id="Construction">Construction</h2><p>Airports are built on owned land. An active airport is required to deploy fighters and attack helicopters. Aircraft that need to repair or retreat return to a valid owned airport.</p>
    <h2 id="Air_trade">Air trade</h2><p>Active airports automatically choose valid partner airports owned by players who can trade with the airport owner. Airport level increases the number of spawn opportunities and also weights the airport as a trade destination.</p>
    <h2 id="Railroads">Railroads</h2><p>An airport can snap to an existing railroad and create a train station under the same proximity rules used by ports and cities. A train visiting an airport pays exactly <strong>20% less than a port stop</strong>.</p>
    <h2 id="Levels_and_repair">Levels and repair</h2><p>Airport levels mirror the port support model. Each level increases flight generation and the number of fighters that can repair there. Fighters use the same level-based healing bonus and retreat threshold as warships.</p>`,
  ),
  page(
    'Passenger_Plane',
    'Passenger Plane',
    'The faster air-trade twin of the trade ship, with protected departure and an 800-unit cap.',
    [
      { id: 'Trade_route', text: 'Trade route', level: 2 },
      { id: 'Income', text: 'Income', level: 2 },
      { id: 'Hijacking', text: 'Hijacking', level: 2 },
      { id: 'Marker', text: 'Marker', level: 2 },
    ],
    `<p>The <strong>Passenger Plane</strong> is the air twin of the <a href="/Trade_Ship">Trade Ship</a>. It is generated automatically by airports, travels between valid trading partners, and pays both ends of a completed route.</p>
    <div class="sd-spec-grid"><div class="sd-spec"><span>Speed</span><strong>1.2 tiles/tick</strong></div><div class="sd-spec"><span>Global cap</span><strong>800 planes</strong></div><div class="sd-spec"><span>Player cost</span><strong>Automatic</strong></div><div class="sd-spec"><span>Marker</span><strong>Small triangle</strong></div></div>
    <h2 id="Trade_route">Trade route</h2><p>Routes connect active airports belonging to players who are allowed to trade. The route planner separates nearby flights into readable lanes while keeping travel efficient. A captured plane diverts to the nearest friendly active airport.</p>
    <h2 id="Income">Income</h2><p>Air trade uses a premium version of the trade-ship distance curve: a 175,000-gold sigmoid base plus 75 gold per distance unit, modified by the normal player gold multiplier. The higher return balances the 20% faster route.</p>
    <h2 id="Hijacking">Hijacking</h2><p>Fighter jets can capture enemy passenger planes at close range just as warships pirate trade ships. Planes receive the existing piracy-protection window on departure and again after capture, preventing immediate back-and-forth hijacks.</p>
    <h2 id="Marker">Marker</h2><p>Passenger planes appear as compact triangles at the same visual scale as trade ships. The game deliberately avoids a large literal airplane icon so dense air traffic remains readable.</p>`,
  ),
  page(
    'Fighter_Jet',
    'Fighter Jet',
    'The air-combat twin of the warship, with matching combat rules and 20% faster movement.',
    [
      { id: 'Warship_parity', text: 'Warship parity', level: 2 },
      { id: 'Cost', text: 'Cost', level: 2 },
      { id: 'Targets', text: 'Targets', level: 2 },
      { id: 'Repair_and_levels', text: 'Repair and levels', level: 2 },
    ],
    `<p>The <strong>Fighter Jet</strong> is the air twin of the <a href="/Warship">Warship</a>. It patrols an ordered area, detects hostile aircraft, fires from warship range, hijacks civilian aircraft, earns veterancy, and retreats to an airport for repair.</p>
    <div class="sd-spec-grid"><div class="sd-spec"><span>Base health</span><strong>1,000 HP</strong></div><div class="sd-spec"><span>Patrol speed</span><strong>1.2 tiles/tick</strong></div><div class="sd-spec"><span>Pursuit speed</span><strong>2.4 tiles/tick</strong></div><div class="sd-spec"><span>Targeting range</span><strong>130 tiles</strong></div><div class="sd-spec"><span>First jet</span><strong>600K gold</strong></div><div class="sd-spec"><span>Price cap</span><strong>2.4M gold</strong></div></div>
    <h2 id="Warship_parity">Warship parity</h2><p>Jets reuse the warship’s 1,000 base health, 20-tick firing interval, three veterancy levels, level health and damage bonuses, patrol envelope, targeting range, retreat threshold, repair capacity, and capture progression. Air movement and air-only targets are the deliberate differences.</p>
    <h2 id="Cost">Cost</h2><p>Jets use the same economic ratio as air trade compared with sea trade. Their price rises by 600,000 gold for each lifetime construction and caps at 2.4 million. Losing or landing a jet does not reset the price while later jets remain deployed.</p>
    <h2 id="Targets">Targets</h2><p>Jets prioritize military aircraft, then passenger-plane capture opportunities. They can fire at other jets while those jets are still travelling, and they shoot from range rather than colliding or orbiting indefinitely. A direct fighter hit destroys an attack helicopter. A jet cannot perform passenger-plane piracy if its owner has no port.</p>
    <h2 id="Repair_and_levels">Repair and levels</h2><p>At or below 75% of its veterancy-adjusted health, a fighter returns to an available owned airport. Airport level controls simultaneous repair capacity and adds the same per-level healing bonus a port gives a warship.</p>`,
  ),
  page(
    'Attack_Helicopter',
    'Attack Helicopter',
    'A paid, one-time air insertion unit based on the transport ship, limited to two active aircraft.',
    [
      { id: 'Launch', text: 'Launch', level: 2 },
      { id: 'Flight_and_warning', text: 'Flight and warning', level: 2 },
      { id: 'Landing', text: 'Landing', level: 2 },
      { id: 'Interception', text: 'Interception', level: 2 },
    ],
    `<p>The <strong>Attack Helicopter</strong> is the air twin of the <a href="/Transport_Ship">Transport Ship</a>. It carries real troops from the nearest active airport to a land target and is consumed after the mission.</p>
    <div class="sd-spec-grid"><div class="sd-spec"><span>Base health</span><strong>800 HP</strong></div><div class="sd-spec"><span>Flight speed</span><strong>1.2 tiles/tick</strong></div><div class="sd-spec"><span>Active limit</span><strong>2 per player</strong></div><div class="sd-spec"><span>Cost curve</span><strong>1M → 3M</strong></div></div>
    <h2 id="Launch">Launch</h2><p>The player chooses a valid landing tile and troop payload. The aircraft launches from the nearest active owned airport. Its payload is debited from the player’s real troops, and no player may have more than two attack helicopters active at once.</p>
    <h2 id="Flight_and_warning">Flight and warning</h2><p>The helicopter follows the transport-ship interaction model in the air. It leaves a visible trail and shows an arrival timer to both the attacker and the threatened player. Its triangular marker matches the passenger-plane language while the trail distinguishes the military mission.</p>
    <h2 id="Landing">Landing</h2><p>On arrival, the carried troops fight for the destination through the normal land-combat rules. The landing zone has ten seconds of protection from automatic surrounded-territory annexation. A completed mission consumes the helicopter so it cannot ferry troops repeatedly.</p>
    <h2 id="Interception">Interception</h2><p>Enemy fighter jets can intercept helicopters at the same distance relationship used by warships against transport ships. One successful fighter shell destroys the helicopter. If the mission becomes invalid, the helicopter returns toward a valid owned airport and returns surviving troops according to the normal retreat outcome.</p>`,
  ),
  page(
    'Base_Mechanics_Parity',
    'Base Mechanics Parity',
    'The compatibility policy and tests that keep original OpenFront behavior unchanged.',
    [
      { id: 'Protected_scope', text: 'Protected scope', level: 2 },
      { id: 'Air_extensions', text: 'Air extensions', level: 2 },
      { id: 'Verification', text: 'Verification', level: 2 },
    ],
    `<p>SoftDiplomacy treats original OpenFront behavior as a contract. The air modification is considered correct only when existing mechanics continue to behave the same and air units add parallel capabilities.</p>
    <h2 id="Protected_scope">Protected scope</h2><ul><li>Warship movement, combat, repair, piracy, veterancy, and price behavior remain unchanged.</li><li>Trade ships retain their spawn, route, payout, and capture behavior.</li><li>Transport ships retain troop loading, route, warning, landing, and retreat behavior.</li><li>Ports, factories, cities, trains, railroads, missiles, diplomacy, bots, controls, and the HUD retain upstream semantics.</li></ul>
    <h2 id="Air_extensions">Air extensions</h2><p>Passenger planes call parallel air-trade code; fighters call parallel fighter code configured from warship values; helicopters call parallel special-operations code modeled on transport ships; airports extend the supported railroad-station types without changing port payouts.</p>
    <h2 id="Verification">Verification</h2><p>The repository includes base-mechanics parity tests plus focused tests for aircraft trade, fighter combat, aircraft interception, airport rail connections, train income, rendering, controls, bots, and full lifecycle behavior. Each 36-hour audit runs formatting, linting, tests, and a production build before validated changes are pushed.</p>`,
  ),
  page(
    'Update_Status',
    'Update Status',
    'Latest OpenFront source and wiki audit recorded for SoftDiplomacy.',
    [
      { id: 'Latest_audit', text: 'Latest audit', level: 2 },
      { id: 'Sources', text: 'Sources', level: 2 },
      { id: 'Cadence', text: 'Cadence', level: 2 },
    ],
    `<p>This page records the latest source audit used to update the SoftDiplomacy game and wiki.</p>
    <h2 id="Latest_audit">Latest audit</h2><div class="sd-spec-grid"><div class="sd-spec"><span>Audit date</span><strong>27 Aug 2026</strong></div><div class="sd-spec"><span>OpenFront main</span><strong>${auditedRevision.slice(0, 10)}</strong></div><div class="sd-spec"><span>Wiki coverage</span><strong>All published pages</strong></div><div class="sd-spec"><span>Next check</span><strong>Within 36 hours</strong></div></div>
    <h2 id="Sources">Sources</h2><ul><li><a class="external" href="https://github.com/openfrontio/OpenFrontIO">Official OpenFront GitHub repository</a></li><li><a class="external" href="https://openfront.wiki/">OpenFront community wiki</a></li><li><a class="external" href="https://github.com/openfrontio/wiki">OpenFront wiki source repository</a></li><li><a class="external" href="https://github.com/dfgamer-commits/soft-diplomacy">SoftDiplomacy game repository</a></li></ul>
    <h2 id="Cadence">Cadence</h2><p>An automated task reopens this audit every 36 hours. It compares source history, reviews wiki changes, validates compatibility, updates these pages, and pushes only after the relevant checks pass.</p>`,
  ),
];

await mkdir(pagesRoot, { recursive: true });

const officialPages = (await loadOfficialPages()).map((entry) => ({
  ...entry,
  cats: entry.cats || [],
  headings: entry.headings || [],
  html: cleanHtml(entry.html || ''),
}));

const customSlugs = new Set(customPages.map((entry) => entry.slug));
const pages = [
  ...officialPages.filter((entry) => !customSlugs.has(entry.slug)),
  ...customPages,
].sort((a, b) => a.title.localeCompare(b.title));

for (const entry of pages) {
  await writeFile(
    path.join(pagesRoot, `${encodeURIComponent(entry.slug)}.json`),
    `${JSON.stringify(entry)}\n`,
  );
}

const index = pages.map((entry) =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'html')),
);
await writeFile(path.join(contentRoot, 'index.json'), `${JSON.stringify(index)}\n`);
await writeFile(
  path.join(contentRoot, 'sync.json'),
  `${JSON.stringify({
    auditedAt: '2026-08-27',
    upstreamRevision: auditedRevision,
    officialPageCount: officialPages.length,
    softDiplomacyPageCount: customPages.length,
    totalPageCount: pages.length,
  }, null, 2)}\n`,
);

console.log(
  `Synced ${officialPages.length} OpenFront pages and ${customPages.length} SoftDiplomacy pages.`,
);
