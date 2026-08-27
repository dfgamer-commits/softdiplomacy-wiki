import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const projectRoot = path.resolve(import.meta.dirname, '..');
const contentRoot = path.join(projectRoot, 'public', 'content');
const pagesRoot = path.join(contentRoot, 'pages');
const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const sourcePath = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined;

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

function normalizedOfficialPage(entry) {
  return {
    ...entry,
    cats: entry.cats || [],
    headings: entry.headings || [],
    html: cleanHtml(entry.html || ''),
  };
}

function headingIds(html) {
  return [...html.matchAll(/<h[1-6]\b[^>]*\bid="([^"]+)"/gi)].map(
    (match) => match[1],
  );
}

function plainText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function loadGeneratedPage(slug) {
  const filename = `${encodeURIComponent(slug)}.json`;
  return JSON.parse(await readFile(path.join(pagesRoot, filename), 'utf8'));
}

async function assertFile(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${message}: ${filePath}`);
  }
}

const officialPages = await loadOfficialPages();
const officialSlugs = new Set();
const index = JSON.parse(
  await readFile(path.join(contentRoot, 'index.json'), 'utf8'),
);
const indexBySlug = new Map(index.map((entry) => [entry.slug, entry]));
let referencedImages = 0;

for (const sourceEntry of officialPages) {
  if (officialSlugs.has(sourceEntry.slug)) {
    throw new Error(`Duplicate official slug: ${sourceEntry.slug}`);
  }
  officialSlugs.add(sourceEntry.slug);

  const expected = normalizedOfficialPage(sourceEntry);
  const actual = await loadGeneratedPage(sourceEntry.slug);
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      `Official page differs from source after safety-only HTML cleaning: ${sourceEntry.slug}`,
    );
  }
  if (actual.softDiplomacy) {
    throw new Error(`Official page was overridden by custom content: ${sourceEntry.slug}`);
  }

  const expectedIndex = Object.fromEntries(
    Object.entries(expected).filter(([key]) => key !== 'html'),
  );
  if (!isDeepStrictEqual(indexBySlug.get(sourceEntry.slug), expectedIndex)) {
    throw new Error(`Index metadata differs from source: ${sourceEntry.slug}`);
  }

  for (const match of expected.html.matchAll(/\bsrc="\/images\/([^"?#]+)[^\"]*"/gi)) {
    const relativeImage = decodeURIComponent(match[1]);
    const localImage = path.resolve(projectRoot, 'public', 'images', relativeImage);
    const imageRoot = path.resolve(projectRoot, 'public', 'images');
    if (!localImage.startsWith(`${imageRoot}${path.sep}`)) {
      throw new Error(`Unsafe official image path: ${match[1]}`);
    }
    await assertFile(localImage, `Missing image referenced by ${sourceEntry.slug}`);
    referencedImages++;
  }
}

const requiredAirStructure = {
  Airport_SoftDiplomacy: [
    'Description',
    'How_to_Build',
    'Properties',
    'Passenger_Plane_Spawning',
    'Air_Route_Selection',
    'Gold_Generation',
    'Railroads',
    'Military_aircraft',
    'Levels_and_repair',
    'See_also',
  ],
  Passenger_Plane: [
    'Description',
    'How_to_Spawn',
    'Properties',
    'Passenger_Plane_Spawning',
    'Air_Route_Selection',
    'Gold_Generation',
    'Piracy_Protection',
    'Passenger_Plane_Behavior',
    'Capture_Destruction_Mechanics',
    'Trade_Relationships',
    'Appearance',
    'See_also',
  ],
  Fighter_Jet: [
    'Description',
    'How_to_Spawn',
    'Properties',
    'Repair',
    'Passive_healing',
    'Docked_repair',
    'Veterancy',
    'Gaining_veterancy',
    'Veterancy_effects',
    'Behavior',
    'Manual_Moving',
    'Patrol',
    'Fight',
    'Target_Priority',
    'Capturing',
    'Appearance',
    'See_Also',
  ],
  Attack_Helicopter: [
    'Description',
    'How_to_Spawn',
    'Properties',
    'Flight_and_warning',
    'Landing',
    'Retreat',
    'Interception',
    'Appearance',
    'See_also',
  ],
};

const requiredFacts = {
  Airport_SoftDiplomacy: [
    '2,500,000 gold',
    '50 ticks (5 seconds)',
    '800 active passenger planes',
    '80% of the corresponding port-stop payment',
    '5 HP per tick per airport level',
  ],
  Passenger_Plane: [
    '1.2 tiles per tick',
    '800 passenger planes',
    '175000',
    '20 ticks (2 seconds)',
    'Manhattan distance 5',
    'small triangle',
  ],
  Fighter_Jet: [
    '1,000 base HP',
    '600,000 gold',
    '2,400,000',
    '1.2 tiles per tick',
    '2.4 tiles per tick',
    '130 tiles',
    '20-tick interval',
    'three veterancy levels',
    'active, completed Port',
    'pentagon',
  ],
  Attack_Helicopter: [
    '800 HP',
    '1.2 tiles per tick',
    '2 per player',
    '3,000,000',
    '100,000 troops',
    '10 seconds',
    '75%',
    'triangle',
  ],
};

for (const [slug, requiredIds] of Object.entries(requiredAirStructure)) {
  const page = await loadGeneratedPage(slug);
  if (!page.softDiplomacy) {
    throw new Error(`Air page is not marked as SoftDiplomacy content: ${slug}`);
  }
  const actualIds = new Set(headingIds(page.html));
  const pageText = plainText(page.html);
  for (const id of requiredIds) {
    if (!actualIds.has(id)) {
      throw new Error(`Air page ${slug} is missing required section ${id}`);
    }
  }
  for (const fact of requiredFacts[slug]) {
    if (!pageText.includes(fact)) {
      throw new Error(`Air page ${slug} is missing required fact: ${fact}`);
    }
  }
}

const twinCoverage = {
  Port: {
    air: 'Airport_SoftDiplomacy',
    map: {
      Trade_Ship_Spawning: 'Passenger_Plane_Spawning',
      Trade_Route_Selection: 'Air_Route_Selection',
      Gold_Generation: 'Gold_Generation',
      See_also: 'See_also',
    },
  },
  Trade_Ship: {
    air: 'Passenger_Plane',
    map: {
      Trade_Ship_Spawning: 'Passenger_Plane_Spawning',
      Trade_Route_Selection: 'Air_Route_Selection',
      Gold_Generation: 'Gold_Generation',
      Piracy_Protection: 'Piracy_Protection',
      Trade_Ship_Behavior: 'Passenger_Plane_Behavior',
      'Capture/Destruction_Mechanics': 'Capture_Destruction_Mechanics',
      Trade_Relationships: 'Trade_Relationships',
      See_also: 'See_also',
    },
  },
  Warship: {
    air: 'Fighter_Jet',
    map: {
      Description: 'Description',
      How_to_Spawn: 'How_to_Spawn',
      Properties: 'Properties',
      Repair: 'Repair',
      Passive_healing: 'Passive_healing',
      Docked_repair: 'Docked_repair',
      Veterancy: 'Veterancy',
      Gaining_veterancy: 'Gaining_veterancy',
      Veterancy_effects: 'Veterancy_effects',
      Behavior: 'Behavior',
      Manual_Moving: 'Manual_Moving',
      Patrol: 'Patrol',
      Fight: 'Fight',
      Target_Priority: 'Target_Priority',
      Capturing: 'Capturing',
      See_Also: 'See_Also',
    },
  },
  Transport_Ship: {
    air: 'Attack_Helicopter',
    map: {
      Description: 'Description',
      How_to_Spawn: 'How_to_Spawn',
      Properties: 'Properties',
      See_also: 'See_also',
    },
  },
};

for (const [waterSlug, coverage] of Object.entries(twinCoverage)) {
  const waterPage = await loadGeneratedPage(waterSlug);
  const airPage = await loadGeneratedPage(coverage.air);
  const airIds = new Set(headingIds(airPage.html));
  for (const waterId of headingIds(waterPage.html)) {
    const airId = coverage.map[waterId];
    if (!airId) {
      throw new Error(
        `No air-unit topic mapping for ${waterSlug} section ${waterId}`,
      );
    }
    if (!airIds.has(airId)) {
      throw new Error(
        `${coverage.air} does not cover ${waterSlug} section ${waterId}`,
      );
    }
  }
}

const officialIndexCount = index.filter((entry) => !entry.softDiplomacy).length;
if (officialIndexCount !== officialPages.length) {
  throw new Error(
    `Official index count mismatch: expected ${officialPages.length}, got ${officialIndexCount}`,
  );
}

console.log(
  `Verified ${officialPages.length} exact official pages, ${referencedImages} image references, and complete naval-twin coverage for 4 air articles.`,
);
