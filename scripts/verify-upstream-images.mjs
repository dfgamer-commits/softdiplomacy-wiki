import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const contentRoot = path.join(projectRoot, 'public', 'content');
const imageRoot = path.join(projectRoot, 'public', 'images');
const sync = JSON.parse(await readFile(path.join(contentRoot, 'sync.json'), 'utf8'));
const updateMode = process.argv.includes('--update');
const index = JSON.parse(await readFile(path.join(contentRoot, 'index.json'), 'utf8'));
const officialEntries = index.filter((entry) => !entry.softDiplomacy);
const imageNames = new Set();

for (const entry of officialEntries) {
  const page = JSON.parse(
    await readFile(
      path.join(contentRoot, 'pages', `${encodeURIComponent(entry.slug)}.json`),
      'utf8',
    ),
  );
  for (const match of page.html.matchAll(/\bsrc="\/images\/([^"?#]+)[^"]*"/gi)) {
    imageNames.add(decodeURIComponent(match[1]));
  }
}

function digest(bytes, name) {
  const comparable = name.toLowerCase().endsWith('.svg')
    ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'))
    : bytes;
  return createHash('sha256').update(comparable).digest('hex');
}

function rawImageUrl(name) {
  const encodedPath = name.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/openfrontio/wiki/${sync.upstreamWikiRevision}/public/images/${encodedPath}`;
}

const names = [...imageNames].sort();
let cursor = 0;
let matched = 0;
let updated = 0;

async function worker() {
  while (cursor < names.length) {
    const name = names[cursor++];
    const localPath = path.resolve(imageRoot, name);
    if (!localPath.startsWith(`${imageRoot}${path.sep}`)) {
      throw new Error(`Unsafe image path: ${name}`);
    }

    const [localBytes, response] = await Promise.all([
      readFile(localPath),
      fetch(rawImageUrl(name)),
    ]);
    if (!response.ok) {
      throw new Error(`Official image unavailable (${response.status}): ${name}`);
    }
    const remoteBytes = Buffer.from(await response.arrayBuffer());
    if (digest(localBytes, name) !== digest(remoteBytes, name)) {
      if (!updateMode) {
        throw new Error(`Local image differs from official source: ${name}`);
      }
      await writeFile(localPath, remoteBytes);
      updated++;
      continue;
    }
    matched++;
  }
}

await Promise.all(Array.from({ length: 12 }, () => worker()));

console.log(
  updateMode
    ? `Matched ${matched} official wiki images and updated ${updated} stale images from revision ${sync.upstreamWikiRevision.slice(0, 10)}.`
    : `Verified ${matched} unique official wiki images byte-for-byte at OpenFront wiki revision ${sync.upstreamWikiRevision.slice(0, 10)}.`,
);
