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
const wikiAuditIndex = args.indexOf('--wiki-audit');
const auditedWikiRevision =
  wikiAuditIndex >= 0 ? args[wikiAuditIndex + 1] : 'unknown';
const auditedAtIndex = args.indexOf('--audited-at');
const auditedAt =
  auditedAtIndex >= 0
    ? args[auditedAtIndex + 1]
    : new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(auditedAt)) {
  throw new Error(`Invalid --audited-at date: ${auditedAt}`);
}
const [auditYear, auditMonth, auditDay] = auditedAt.split('-').map(Number);
const auditMonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const auditedAtDisplay = `${auditDay} ${auditMonthNames[auditMonth - 1]} ${auditYear}`;

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
    <div class="sd-notice"><strong>Documentation boundary:</strong> base-game reference articles come from the OpenFront wiki. Pages labeled SoftDiplomacy describe custom airports and aircraft. Naval parity is a design goal, not a guarantee that every behavior is identical.</div>
    <h2 id="What_changes">What changes</h2>
    <ul><li>Airports provide civilian air trade, fighter deployment, helicopter deployment, upgrades, healing support, and railroad connections.</li><li>Passenger planes extend trade into the air.</li><li>Fighter jets extend warship-style combat and piracy into the air.</li><li>Attack helicopters extend transport-ship troop delivery into the air.</li></ul>
    <h2 id="What_stays_the_same">What stays the same</h2>
    <p>For non-air gameplay, read the original <a href="/Combat">Combat</a>, <a href="/Buildings">Buildings</a>, <a href="/Gold">Gold</a>, and other OpenFront reference articles. This custom overview does not replace those rules.</p>
    <h2 id="Update_policy">Update policy</h2>
    <p>The scheduled review target is every 48 hours. The <a href="/Update_Status">recorded audit</a> identifies the last source snapshot; it is not a live health check or a promise that no bugs remain.</p>`,
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
    'The complete air-hub manual: construction, passenger-plane spawning, routes, gold, railroads, upgrades, deployment, and repair.',
    [
      { id: 'Description', text: 'Description', level: 1 },
      { id: 'How_to_Build', text: 'How to Build', level: 1 },
      { id: 'Properties', text: 'Properties', level: 1 },
      { id: 'Passenger_Plane_Spawning', text: 'Passenger Plane Spawning', level: 1 },
      { id: 'Air_Route_Selection', text: 'Air Route Selection', level: 1 },
      { id: 'Gold_Generation', text: 'Gold Generation', level: 1 },
      { id: 'Railroads', text: 'Railroads', level: 1 },
      { id: 'Military_aircraft', text: 'Military aircraft', level: 1 },
      { id: 'Levels_and_repair', text: 'Levels and repair', level: 1 },
      { id: 'See_also', text: 'See also', level: 1 },
    ],
    `<p>The <strong>Airport</strong> is SoftDiplomacy’s air equivalent of the <a href="/Port">Port</a>. It automatically spawns <a href="/Passenger_Plane">Passenger Planes</a>, allows <a href="/Fighter_Jet">Fighter Jets</a> and <a href="/Attack_Helicopter">Attack Helicopters</a> to launch, repairs fighters, and can act as a railroad station.</p>
    <div class="sd-notice"><strong>Naval twin:</strong> this article includes every subject covered by the OpenFront <a href="/Port">Port</a> article—spawning, route selection, gold generation, and related units—then documents the airport-only adjustments.</div>
    <h1 id="Description">Description</h1><p>Airports are owned land structures and the operational base for the entire air layer. Civilian flights need a source and destination airport. Military aircraft spawn at the nearest valid owned airport. A fighter that retreats uses an owned airport as its repair base.</p>
    <h1 id="How_to_Build">How to Build</h1><p>Open the build menu on owned land and choose Airport, or use the default <kbd>I</kbd> keybind. A new airport costs <strong>2,500,000 gold</strong> and takes <strong>50 ticks (5 seconds)</strong> to construct in a normal-speed game. Airports are upgradable; each additional level costs another 2,500,000 gold.</p>
    <h1 id="Properties">Properties</h1><ul><li><strong>Cost:</strong> 2,500,000 gold for a new airport or each upgrade level.</li><li><strong>Construction time:</strong> 50 ticks (5 seconds at 100 ms per tick).</li><li><strong>Location:</strong> owned, valid land.</li><li><strong>Upgradeable:</strong> yes.</li><li><strong>Passenger-plane source and destination:</strong> yes.</li><li><strong>Fighter and helicopter launch base:</strong> yes.</li><li><strong>Fighter repair base:</strong> yes.</li><li><strong>Railroad station:</strong> yes, when connected to the network.</li></ul>
    <h1 id="Passenger_Plane_Spawning">Passenger Plane Spawning</h1><p>Every active, completed airport checks once every <strong>10 ticks</strong> whether it should schedule a passenger plane. Each airport level provides one spawn attempt per check. Failed attempts build a local pity counter; successful attempts reset it.</p><pre>decayRate = ln(2) / 50
baseSpawnRate = 1 - sigmoid(totalPassengerPlanes, decayRate, 200)
rejectionModifier = 1 / (consecutiveRejections + 1)
aircraftSpawnRate = floor((100 * rejectionModifier) / baseSpawnRate)
spawn chance per level attempt = 1 / aircraftSpawnRate</pre><p>Spawning stops at the global cap of <strong>800 active passenger planes</strong>. The cap is checked both when the airport schedules a flight and when the queued flight actually creates its plane, so simultaneous airports cannot exceed it. Passenger planes are free and do not use a normal military-unit limit.</p>
    <h1 id="Air_Route_Selection">Air Route Selection</h1><p>An airport trades only with active, completed airports owned by <strong>other players</strong> who can trade with its owner. A destination airport is weighted once per destination level. A friendly destination at least 300 Manhattan-distance units away receives the same weight again, doubling its selection chance.</p><p>After selection, a deterministic local route planner creates a gently curved lane close to the direct path. Opposite and same-direction traffic receive small offsets, keeping dense routes readable without the old map-wide corridors that caused apparent frozen lines of aircraft.</p>
    <h1 id="Gold_Generation">Gold Generation</h1><p>Gold uses Manhattan distance between the source and destination airports and the normal player gold multiplier:</p><pre>baseGold = 175000 / (1 + exp(-0.03 * (distance - 300))) + 75 * distance
gold = floor(baseGold * playerGoldMultiplier)</pre><p>When an ordinary flight completes and both airports remain active, <strong>both airport owners receive the full amount</strong>. When a hijacked plane completes, only its current owner receives the full amount.</p>
    <h1 id="Railroads">Railroads</h1><p>An airport can snap to existing railroads under the same rail-overlap and station-range rules used by ports and cities. If a factory is within the configured station range, an active airport promotes itself to a train station and joins the network. A train visiting an airport pays the train owner and, for external trade, the airport owner. Each payment is exactly <strong>80% of the corresponding port-stop payment</strong>—20% less—without changing port or city payouts.</p>
    <h1 id="Military_aircraft">Military aircraft</h1><p>A <a href="/Fighter_Jet">Fighter Jet</a> or <a href="/Attack_Helicopter">Attack Helicopter</a> order can target a valid distant tile, but the aircraft is created at the nearest active owned airport. Fighters keep the clicked location as their patrol destination. Helicopters keep it as their one-time landing mission.</p>
    <h1 id="Levels_and_repair">Levels and repair</h1><p>Airport level has three direct effects: it provides that many passenger-plane spawn attempts per check, adds that much destination-selection weight, and supplies that many simultaneous fighter repair slots. Fighters within 150 tiles of an owned airport heal 1 HP per tick. A docked airport has a repair pool of <strong>5 HP per tick per airport level</strong>, split among its docked fighters, in addition to passive healing. This is the same repair formula used by ports and warships.</p>
    <h1 id="See_also">See also</h1><ul><li><a href="/Air_Units">Air Units</a></li><li><a href="/Passenger_Plane">Passenger Plane</a></li><li><a href="/Fighter_Jet">Fighter Jet</a></li><li><a href="/Attack_Helicopter">Attack Helicopter</a></li><li><a href="/Port">Port</a></li><li><a href="/Railroad">Railroad</a></li></ul>`,
  ),
  page(
    'Passenger_Plane',
    'Passenger Plane',
    'The complete air-trade manual, matching every Trade Ship topic with SoftDiplomacy’s air adjustments.',
    [
      { id: 'Description', text: 'Description', level: 1 },
      { id: 'How_to_Spawn', text: 'How to Spawn', level: 1 },
      { id: 'Properties', text: 'Properties', level: 1 },
      { id: 'Passenger_Plane_Spawning', text: 'Passenger Plane Spawning', level: 1 },
      { id: 'Air_Route_Selection', text: 'Air Route Selection', level: 1 },
      { id: 'Gold_Generation', text: 'Gold Generation', level: 1 },
      { id: 'Piracy_Protection', text: 'Piracy Protection', level: 1 },
      { id: 'Passenger_Plane_Behavior', text: 'Passenger Plane Behavior', level: 1 },
      { id: 'Capture_Destruction_Mechanics', text: 'Capture/Destruction Mechanics', level: 1 },
      { id: 'Trade_Relationships', text: 'Trade Relationships', level: 1 },
      { id: 'Appearance', text: 'Appearance', level: 1 },
      { id: 'See_also', text: 'See also', level: 1 },
    ],
    `<p>The <strong>Passenger Plane</strong> is the air twin of the <a href="/Trade_Ship">Trade Ship</a>. It spawns automatically from an <a href="/Airport_SoftDiplomacy">Airport</a>, flies to another player’s airport, and generates gold when the trip completes.</p>
    <div class="sd-notice"><strong>Naval twin:</strong> this article mirrors every section of the OpenFront Trade Ship article. The differences are air movement, airport endpoints, the 800-plane cap, 20% higher speed, air-specific payout curve, local curved lanes, triangle marker, and fighter-jet hijacking.</div>
    <h1 id="Description">Description</h1><p>Passenger planes are automatic civilian trade units. They are not bought manually, do not carry troops, and do not attack. They have a bright compact triangular marker and fly over land and water between valid airports.</p>
    <h1 id="How_to_Spawn">How to Spawn</h1><p>Build an active airport and maintain a trade relationship with another player who has an active airport. The source airport periodically attempts to schedule a plane; the unit is created at the source airport and receives the destination airport as its target.</p>
    <h1 id="Properties">Properties</h1><ul><li><strong>Cost:</strong> free and automatic.</li><li><strong>Movement:</strong> 1.2 tiles per tick, or 12 tiles per second at 100 ms per tick—20% faster than a trade ship.</li><li><strong>Global active cap:</strong> 800 passenger planes.</li><li><strong>Territory bound:</strong> no; follows an air route over land and water.</li><li><strong>Endpoints:</strong> active airports owned by different players who can trade.</li><li><strong>Combat:</strong> no weapons; can be hijacked by a valid enemy fighter.</li><li><strong>Appearance:</strong> small triangle at trade-ship visual scale.</li></ul>
    <h1 id="Passenger_Plane_Spawning">Passenger Plane Spawning</h1><p>Airports check every 10 ticks. The chance decreases as the global plane count approaches its sigmoid midpoint of 200, while consecutive failed attempts improve that airport’s next chance. Each airport level gets one chance per check:</p><pre>decayRate = ln(2) / 50
baseSpawnRate = 1 - sigmoid(totalPassengerPlanes, decayRate, 200)
rejectionModifier = 1 / (consecutiveRejections + 1)
aircraftSpawnRate = floor((100 * rejectionModifier) / baseSpawnRate)
spawn chance per level attempt = 1 / aircraftSpawnRate</pre><p>No flight can spawn after the global count reaches 800. The queued execution repeats the cap check immediately before construction, closing the simultaneous-spawn race.</p>
    <h1 id="Air_Route_Selection">Air Route Selection</h1><p>The source airport selects only other players’ active, completed airports when those players can trade with its owner. Destination level supplies selection weight. A friendly destination at least 300 Manhattan-distance units away gets double weight.</p><p>The route is a deterministic quadratic curve with waypoints at 25%, 50%, 75%, and 100% progress. The bend stays near the direct path, opposite traffic appears on opposite sides, and a small plane-ID band separates same-direction flights. This avoids map-wide traffic walls and keeps travel efficient.</p>
    <h1 id="Gold_Generation">Gold Generation</h1><p>Gold is calculated from Manhattan distance and the ordinary player gold multiplier:</p><pre>baseGold = 175000 / (1 + exp(-0.03 * (distance - 300))) + 75 * distance
gold = floor(baseGold * playerGoldMultiplier)</pre><p>For a normal completed flight, the source and destination airport owners each receive the full amount if both airports are still active. For a captured flight, the capturing/current owner receives the full amount alone when it reaches the diversion airport.</p>
    <h1 id="Piracy_Protection">Piracy Protection</h1><p>A passenger plane is marked safe from piracy at departure and again immediately after a successful hijack. The protection lasts <strong>20 ticks (2 seconds)</strong>. During that window no fighter can capture it. This reuses the same safety state and cooldown as trade ships; it is not a faster air-only hijack system.</p>
    <h1 id="Passenger_Plane_Behavior">Passenger Plane Behavior</h1><p>The server moves the plane through local-lane segments at a configured 1.2 tiles per tick and publishes motion plans for rendering. The plane is removed after its route. After capture, it tries to select the nearest active, completed airport owned by or friendly to its new owner; with no such airport it is deleted.</p><div class="sd-notice"><strong>Known limitation — local review, 7 Sep 2026:</strong> if the nearest diversion airport belongs to an ally rather than the capturer, the routing check can restart the flight every tick and leave the plane stuck. This is an unresolved implementation issue, not an intended air rule.</div>
    <h1 id="Capture_Destruction_Mechanics">Capture/Destruction Mechanics</h1><p>A fighter captures a passenger plane at Manhattan distance 5 or less when all piracy gates pass. The fighter owner must have an active, completed port; the plane must be outside its protection window; the owners must be hostile; and the target must not belong to the fighter owner or a friendly player. The plane changes ownership intact, gives the fighter capture progress toward veterancy, gains a fresh piracy-protection window, and diverts to the nearest valid friendly airport.</p><p>A passenger plane may also be destroyed by any ordinary game effect that can damage or invalidate that unit. Fighter logic captures passenger planes rather than shelling them during normal automatic targeting.</p>
    <h1 id="Trade_Relationships">Trade Relationships</h1><p>Players must be allowed to trade when the airport selects a flight. Selection excludes the source owner’s airports.</p><div class="sd-notice"><strong>Known limitation — local review, 7 Sep 2026:</strong> an ordinary flight does not recheck trade permission or prevent both endpoints becoming owned by one player while in transit. Completion checks that both airports remain active. Embargoes and ownership changes can therefore still lead to a payout. This does not yet match the intended naval-twin behavior.</div>
    <h1 id="Appearance">Appearance</h1><p>On the map, passenger planes are compact <strong>triangles</strong> at the same visual scale as trade-ship dots. They do not use a large literal airplane drawing. Their server-supplied motion heading is smoothed on the client so the marker does not periodically flick sideways.</p>
    <h1 id="See_also">See also</h1><ul><li><a href="/Airport_SoftDiplomacy">Airport</a></li><li><a href="/Fighter_Jet">Fighter Jet</a></li><li><a href="/Air_Units">Air Units</a></li><li><a href="/Trade_Ship">Trade Ship</a></li><li><a href="/Port">Port</a></li><li><a href="/Trade">Trade</a></li></ul>`,
  ),
  page(
    'Fighter_Jet',
    'Fighter Jet',
    'The complete air-combat manual, matching every Warship topic with SoftDiplomacy’s air adjustments.',
    [
      { id: 'Description', text: 'Description', level: 1 },
      { id: 'How_to_Spawn', text: 'How to Spawn', level: 1 },
      { id: 'Properties', text: 'Properties', level: 1 },
      { id: 'Repair', text: 'Repair', level: 1 },
      { id: 'Passive_healing', text: 'Passive healing', level: 2 },
      { id: 'Docked_repair', text: 'Docked repair', level: 2 },
      { id: 'Veterancy', text: 'Veterancy', level: 1 },
      { id: 'Gaining_veterancy', text: 'Gaining veterancy', level: 2 },
      { id: 'Veterancy_effects', text: 'Effects', level: 2 },
      { id: 'Behavior', text: 'Behavior', level: 1 },
      { id: 'Manual_Moving', text: 'Manual Moving', level: 2 },
      { id: 'Patrol', text: 'Patrol', level: 2 },
      { id: 'Fight', text: 'Fight', level: 2 },
      { id: 'Target_Priority', text: 'Target Priority', level: 2 },
      { id: 'Capturing', text: 'Capturing', level: 2 },
      { id: 'Appearance', text: 'Appearance', level: 1 },
      { id: 'See_Also', text: 'See Also', level: 1 },
    ],
    `<p>The <strong>Fighter Jet</strong> is the air twin of the <a href="/Warship">Warship</a>. It launches from an <a href="/Airport_SoftDiplomacy">Airport</a>, patrols an ordered area, fights hostile aircraft with shells, hijacks passenger planes, gains veterancy, and retreats to an airport for repair.</p>
    <div class="sd-notice"><strong>Naval twin:</strong> this article covers the same subject areas as the OpenFront Warship article. Fighters share several configuration values, but air targeting, movement, airport support, and lifetime pricing have their own implementation. The differences below should not be read as exact behavioral parity.</div>
    <h1 id="Description">Description</h1><p>Fighter jets are player-bought military aircraft. The first costs 600,000 gold. Every lifetime construction raises the next price by 600,000 gold until the price reaches 2,400,000. The lifetime count is intentional: losing, deleting, or docking a jet never resets the price.</p>
    <h1 id="How_to_Spawn">How to Spawn</h1><p>Build at least one active, completed airport. Choose Fighter Jet from the military-air menu or use the default <kbd>J</kbd> keybind, then select any valid map destination. The jet appears at the active owned airport nearest that destination and flies to the clicked location, which becomes its patrol center.</p>
    <h1 id="Properties">Properties</h1><ul><li><strong>Hit Points:</strong> 1,000 base HP.</li><li><strong>Cost:</strong> <code>min(2,400,000, (lifetimeFightersConstructed + 1) × 600,000)</code>.</li><li><strong>Patrol movement:</strong> 1.2 tiles per tick—20% faster than a warship.</li><li><strong>Pursuit movement:</strong> 2.4 tiles per tick—20% faster than a warship’s 2-tile piracy pursuit.</li><li><strong>Patrol envelope:</strong> 100-tile radius around the ordered patrol center.</li><li><strong>Detection and targeting range:</strong> 130 tiles.</li><li><strong>Territory bound:</strong> no; can fly over land and water.</li><li><strong>Marker:</strong> compact pentagon at warship/pirate-ship visual scale.</li></ul>
    <h1 id="Repair">Repair</h1><p>Fighters use the two warship repair systems, replacing ports with owned airports. A doomed side cannot repair its fighters. A jet automatically starts a repair retreat below 75% of its veterancy-adjusted maximum health after the brief manual-move protection period. It first heads to the nearest owned airport, can switch to a substantially closer airport, waits or diverts when repair slots are full, and resumes patrol when fully healed.</p>
    <h2 id="Passive_healing">Passive healing</h2><p>Any fighter within 150 tiles of an owned airport heals <strong>1 HP per tick</strong> (10 HP per second at 100 ms per tick), regardless of airport level.</p>
    <h2 id="Docked_repair">Docked repair</h2><p>An airport supplies a repair pool of <strong>5 HP per tick per level</strong>, split evenly among docked fighters, and repairs at most as many fighters simultaneously as its level. Passive healing still applies.</p><table class="wikitable"><tbody><tr><th>Airport level</th><th>Docked fighters</th><th>Repair per fighter</th></tr><tr><td>1</td><td>1</td><td>60 HP/s</td></tr><tr><td>2</td><td>1</td><td>110 HP/s</td></tr><tr><td>2</td><td>2</td><td>60 HP/s each</td></tr><tr><td>3</td><td>1</td><td>160 HP/s</td></tr><tr><td>3</td><td>2</td><td>85 HP/s each</td></tr><tr><td>3</td><td>3</td><td>60 HP/s each</td></tr></tbody></table>
    <h1 id="Veterancy">Veterancy</h1><p>Like warships, fighters gain up to <strong>three veterancy levels</strong>. Each level makes the fighter tougher and its shells stronger. Leveling raises maximum health but does not instantly heal the new capacity.</p>
    <h2 id="Gaining_veterancy">Gaining veterancy</h2><ul><li>Destroying an enemy fighter grants one full level immediately and clears partial progress.</li><li>Destroying 10 attack helicopters grants one level.</li><li>Capturing 25 passenger planes grants one level.</li><li>Helicopter kills and passenger-plane captures share the same integer progress meter, so mixed progress combines and overflow carries across a level.</li></ul>
    <h2 id="Veterancy_effects">Effects</h2><p>Each level adds <strong>20% maximum health</strong> and <strong>20% shell damage</strong>. Veterancy does not change firing rate, range, movement speed, targeting, or repair rate.</p><table class="wikitable"><tbody><tr><th>Veterancy</th><th>Max health</th><th>Shell damage</th></tr><tr><td>0 (base)</td><td>1,000</td><td>200–300</td></tr><tr><td>1</td><td>1,200</td><td>240–360</td></tr><tr><td>2</td><td>1,400</td><td>280–420</td></tr><tr><td>3 (max)</td><td>1,600</td><td>320–480</td></tr></tbody></table>
    <h1 id="Behavior">Behavior</h1><p>A fighter keeps its ordered patrol center, flies varied deterministic patrol legs inside a 100-tile envelope, acquires valid hostile aircraft, and returns to patrol after the target disappears. It may shoot fighters and helicopters encountered while still travelling to a manually ordered destination, without cancelling that flight. During repair retreat it may return fire at military aircraft but does not hijack passenger planes.</p>
    <h2 id="Manual_Moving">Manual Moving</h2><p>Select a fighter and click a new valid destination to move its patrol center. The fighter immediately clears its old target and flies to the new center at 1.2 tiles per tick. A manual intercept order tracks its selected live aircraft target through the same centralized target-validation rules.</p>
    <h2 id="Patrol">Patrol</h2><ul><li>Patrols varied waypoints inside the 100-tile ordered area when no target is present.</li><li>Checks for new targets every 5 ticks.</li><li>Engages hostile military aircraft that enter its 130-tile detection range.</li><li>Pursues passenger planes for capture only when piracy requirements pass.</li><li>Returns to patrol after combat, capture, invalidation, or completed repair.</li></ul>
    <h2 id="Fight">Fight</h2><p>Fighters shoot from range instead of colliding, biting, or circling indefinitely. They share the warship shell execution.</p><ul><li><strong>Attack rate:</strong> one shell per 20-tick interval (2 seconds).</li><li><strong>Shell damage:</strong> a random 200, 225, 250, 275, or 300 before veterancy.</li><li><strong>Shell speed:</strong> 3 tiles per tick.</li><li><strong>Targeting range:</strong> 130 tiles.</li><li><strong>Helicopter interception:</strong> one successful fighter shell deals the helicopter’s remaining health, destroying it in one hit. The fighter does not queue duplicate shells while that lethal shot is in flight.</li></ul>
    <h2 id="Target_Priority">Target Priority</h2><p>Current automatic acquisition order:</p><ol><li>Enemy Fighter Jets.</li><li>Enemy Attack Helicopters.</li><li>Capturable Passenger Planes.</li></ol><p>Within a category, the nearest valid target is selected. This puts fighters ahead of troop carriers: a documented parity difference rather than identical naval targeting. Fighters ignore warships, trade ships, transport ships, trains, infantry, buildings, and missiles.</p>
    <h2 id="Capturing">Capturing</h2><p>A fighter closes on a passenger plane at 2.4 tiles per tick and captures it at Manhattan distance 5 or less. The target must be hostile, outside the 20-tick piracy-protection window, and the fighter owner must have an active, completed <a href="/Port">Port</a>. On capture, the plane changes owner, receives a new protection window, contributes to veterancy, and attempts to divert to a friendly airport.</p><div class="sd-notice"><strong>Known limitation — local review, 7 Sep 2026:</strong> the current piracy check does not protect an enemy-owned plane merely because it is heading to the fighter owner’s airport or an allied airport. Diversions to allied airports can also stall; see <a href="/Passenger_Plane">Passenger Plane</a>.</div>
    <h1 id="Appearance">Appearance</h1><p>On the map, a fighter is a compact <strong>pentagon</strong> at the same visual scale as a warship or pirate-ship marker. It is deliberately not a large literal jet drawing. Server motion plans and client heading smoothing keep the pentagon stable while it turns.</p>
    <h1 id="See_Also">See Also</h1><ul><li><a href="/Airport_SoftDiplomacy">Airport</a></li><li><a href="/Passenger_Plane">Passenger Plane</a></li><li><a href="/Attack_Helicopter">Attack Helicopter</a></li><li><a href="/Air_Units">Air Units</a></li><li><a href="/Warship">Warship</a></li><li><a href="/Trade_Ship">Trade Ship</a></li><li><a href="/Transport_Ship">Transport Ship</a></li></ul>`,
  ),
  page(
    'Attack_Helicopter',
    'Attack Helicopter',
    'The complete one-time air-insertion manual, matching every Transport Ship topic with SoftDiplomacy’s air adjustments.',
    [
      { id: 'Description', text: 'Description', level: 1 },
      { id: 'How_to_Spawn', text: 'How to Spawn', level: 1 },
      { id: 'Properties', text: 'Properties', level: 1 },
      { id: 'Flight_and_warning', text: 'Flight and warning', level: 1 },
      { id: 'Landing', text: 'Landing', level: 1 },
      { id: 'Retreat', text: 'Retreat', level: 1 },
      { id: 'Interception', text: 'Interception', level: 1 },
      { id: 'Appearance', text: 'Appearance', level: 1 },
      { id: 'See_also', text: 'See also', level: 1 },
    ],
    `<p>The <strong>Attack Helicopter</strong> is the air twin of the <a href="/Transport_Ship">Transport Ship</a>. It carries a chosen number of the player’s real troops from the nearest active <a href="/Airport_SoftDiplomacy">Airport</a> to a valid land objective. It has no weaponry and is consumed after one landing or retreat.</p>
    <div class="sd-notice"><strong>Naval twin:</strong> this article mirrors every section and property category in the OpenFront Transport Ship article. The adjustments are airport launch, air movement, 800 HP, paid lifetime-launch pricing, a two-active limit, 20% higher speed, a triangle marker with trail and ETA, fighter interception, and the documented retreat outcome.</div>
    <h1 id="Description">Description</h1><p>Attack helicopters are one-time strategic troop-insertion units. They do not fight ground targets directly and never enter fighter patrol logic or civilian air-trade logic. Their payload is removed from the real troop pool at launch, carried by the aircraft, and handed to the normal land-attack engine only at the destination.</p>
    <h1 id="How_to_Spawn">How to Spawn</h1><p>Build an active, completed airport. Choose Attack Helicopter or use the default <kbd>H</kbd> keybind, set a valid troop payload, and select a passable land tile. The destination may be your own land, wilderness, or hostile land that diplomacy allows you to attack; friendly allied land is rejected. The helicopter appears at the active owned airport nearest the selected destination.</p><p>The default payload is <strong>100,000 troops</strong> when no custom match value is provided. The order fails if the payload is invalid, the player lacks the troops, no valid airport exists, or the player already has two active helicopters.</p>
    <h1 id="Properties">Properties</h1><ul><li><strong>Hit Points:</strong> 800 HP.</li><li><strong>Cost:</strong> <code>min(3,000,000, (lifetimeHelicoptersLaunched + 1) × 1,000,000)</code>.</li><li><strong>Movement:</strong> 1.2 tiles per tick, or 12 tiles per second at 100 ms per tick—20% faster than a transport ship.</li><li><strong>Troop capacity:</strong> the valid payload chosen for that mission; 100,000 is the default.</li><li><strong>Active limit:</strong> 2 per player.</li><li><strong>Territory bound:</strong> no; flies over land and water.</li><li><strong>Weaponry:</strong> none.</li><li><strong>Reuse:</strong> none; the aircraft is consumed after landing or retreat.</li></ul>
    <h1 id="Flight_and_warning">Flight and warning</h1><p>The helicopter flies directly from its launch airport to the mission tile. The server records a synchronized air-motion plan so clients can interpolate the same position and calculate arrival time. The unit leaves a visible trail, and the mission interface exposes the ETA to the attacker and to the threatened player. When a hostile player owns the destination, that player receives an incoming-airborne-invasion notification containing the attacker and troop amount.</p>
    <h1 id="Landing">Landing</h1><p>On arrival at valid hostile or wilderness land, the helicopter establishes the first tile and starts the ordinary <a href="/Combat">land attack</a> with its already-loaded troops; it does not charge the payload a second time. The landing tile receives <strong>10 seconds</strong> of protection from automatic surrounded-territory annexation. Landing on owned land reinforces it. If ownership or diplomacy changes before arrival and the mission is no longer a valid invasion, the troops are returned instead of being silently lost. The helicopter is then deleted.</p>
    <h1 id="Retreat">Retreat</h1><p>If the destination becomes invalid or the mission is cancelled into retreat, the helicopter flies to the nearest active, completed owned airport. A completed retreat returns <strong>75%</strong> of the carried troops and loses 25%. If no valid airport exists, the aircraft is deleted and the full carried troop count is returned immediately. In every case the mission ends; the helicopter cannot become a reusable ferry.</p>
    <h1 id="Interception">Interception</h1><p>Enemy fighter jets detect helicopters within the same <strong>130-tile</strong> targeting range used for warship combat. A fighter shell that reaches an attack helicopter deals its remaining health, so one successful hit destroys it. The shot uses the ordinary shared shell movement, and the fighter marks the target while the lethal shell is travelling so it does not fire a duplicate burst. Friendly, inactive, deleted, or diplomatically invalid aircraft cannot be targeted.</p>
    <h1 id="Appearance">Appearance</h1><p>On the map, the helicopter uses the same compact <strong>triangle</strong> language and size as a passenger plane—not a literal helicopter drawing—but its persistent route trail and ETA identify it as a troop mission. That mirrors the transport ship’s simple marker-plus-trail presentation in the air.</p>
    <h1 id="See_also">See also</h1><ul><li><a href="/Airport_SoftDiplomacy">Airport</a></li><li><a href="/Fighter_Jet">Fighter Jet</a></li><li><a href="/Passenger_Plane">Passenger Plane</a></li><li><a href="/Air_Units">Air Units</a></li><li><a href="/Transport_Ship">Transport Ship</a></li><li><a href="/Warship">Warship</a></li></ul>`,
  ),
  page(
    'Base_Mechanics_Parity',
    'Base Mechanics Parity',
    'The air-expansion design policy, source boundary, and verification limits.',
    [
      { id: 'Protected_scope', text: 'Protected scope', level: 2 },
      { id: 'Air_extensions', text: 'Air extensions', level: 2 },
      { id: 'Verification', text: 'Verification', level: 2 },
    ],
    `<p>SoftDiplomacy treats original OpenFront behavior as a contract. The air modification is considered correct only when existing mechanics continue to behave the same and air units add parallel capabilities.</p>
    <h2 id="Protected_scope">Protected scope</h2><p>The project aims to preserve the original game while adding aircraft. This is a design requirement, not an additional set of base-game mechanics. Original reference articles and their images are kept intact, including source warnings.</p>
    <h2 id="Air_extensions">Air extensions</h2><p>The air layer adds passenger-plane trade, fighter patrol and capture, helicopter troop delivery, and airport support. Their individual articles document the implementation and known differences found during review.</p>
    <h2 id="Verification">Verification</h2><p>The game contains focused parity and aircraft tests. Passing tests cannot establish that all behavior is identical or that the game is bug-free. The wiki checks imported articles against the official source and verifies that base-game animation excerpts appear in that source. Unresolved air behavior is labeled in the relevant aircraft article.</p>`,
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
    `<p>This page records the source snapshot from the last combined game-and-wiki update. Later presentation or documentation reviews do not imply that the game was changed.</p>
    <h2 id="Latest_audit">Latest audit</h2><div class="sd-spec-grid"><div class="sd-spec"><span>Audit date</span><strong>${auditedAtDisplay}</strong></div><div class="sd-spec"><span>OpenFront main</span><strong>${auditedRevision.slice(0, 10)}</strong></div><div class="sd-spec"><span>OpenFront wiki</span><strong>${auditedWikiRevision.slice(0, 10)}</strong></div><div class="sd-spec"><span>Wiki coverage</span><strong>Every official source page</strong></div><div class="sd-spec"><span>Record type</span><strong>Source snapshot</strong></div></div>
    <h2 id="Sources">Sources</h2><ul><li><a class="external" href="https://github.com/openfrontio/OpenFrontIO">Official OpenFront GitHub repository</a></li><li><a class="external" href="https://openfront.wiki/">OpenFront community wiki</a></li><li><a class="external" href="https://github.com/openfrontio/wiki">OpenFront wiki source repository</a></li><li><a class="external" href="https://github.com/dfgamer-commits/soft-diplomacy">SoftDiplomacy game repository</a></li></ul>
    <h2 id="Cadence">Cadence</h2><p>The requested review cadence is 48 hours. This page is a recorded snapshot, not a live monitor. A scheduled check can be delayed or blocked; use the recorded date rather than assuming every cycle completed.</p>`,
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
    auditedAt,
    upstreamRevision: auditedRevision,
    upstreamWikiRevision: auditedWikiRevision,
    officialPageCount: officialPages.length,
    softDiplomacyPageCount: customPages.length,
    totalPageCount: pages.length,
  }, null, 2)}\n`,
);

console.log(
  `Synced ${officialPages.length} OpenFront pages and ${customPages.length} SoftDiplomacy pages.`,
);
