import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadOfficialPages, renderWikiMarkdown, validateOfficialPages } from './official-wiki-source.mjs';

const revision = 'a'.repeat(40);
const base = ['Combat', 'Gold', 'Buildings', 'Port', 'Warship', 'Trade_Ship', 'Transport_Ship'].map((slug) => ({ slug, title: slug, html: `<p>${slug}</p>` }));
const markdown = '---\ntitle: "Warship"\nsection: "Units"\ncats: []\n---\n# Target priority {#Target_Priority}\n\n**Transport ships** first.\n\n<img src="/images/Warship.png" alt="Warship">\n\n<math><mi>HP</mi><mo>=</mo><mn>1000</mn></math>\n\n<table><tr><td>Original table</td></tr></table>';

test('renders official Markdown without losing explicit anchors, images, formulas, or tables', async () => {
  const page = await renderWikiMarkdown('Warship', markdown);
  assert.match(page.html, /id="Target_Priority"/);
  assert.match(page.html, /<strong>Transport ships<\/strong> first/);
  assert.match(page.html, /src="\/images\/Warship.png"/);
  assert.match(page.html, /<math>/);
  assert.match(page.html, /Original table/);
  assert.deepEqual(page.headings, [{ id: 'Target_Priority', text: 'Target priority', level: 1 }]);
});

test('combines migrated game articles and Masters at one pinned revision', async () => {
  const urls = [];
  const pages = await loadOfficialPages({ revision, fetchImpl: async (url) => {
    urls.push(url);
    if (url.includes('/git/trees/')) return Response.json({ tree: [{ type: 'blob', path: 'src/content/wiki/Warship.md' }] });
    if (url.endsWith('pages.json')) return Response.json([...base.filter((p) => p.slug !== 'Warship'), { slug: 'Tournament', title: 'Tournament', source: 'liquipedia', sourceUrl: 'https://liquipedia.net/openfront/Tournament', html: '<p>Competition</p>' }]);
    return new Response(markdown);
  } });
  assert.equal(pages.length, 8);
  assert.equal(pages.find((p) => p.slug === 'Tournament').source, 'liquipedia');
  assert.ok(urls.every((url) => url.includes(revision)));
});

test('supports the legacy complete JSON format', async () => {
  const pages = await loadOfficialPages({ revision, fetchImpl: async (url) => Response.json(url.includes('/git/trees/') ? { tree: [] } : base) });
  assert.equal(pages.length, 7);
});

test('rejects a partial Masters-only import, duplicate slugs, or a truncated tree', async () => {
  assert.throws(() => validateOfficialPages([{ slug: 'Tournament', title: 'Tournament', html: '' }]), /missing Combat/);
  assert.throws(() => validateOfficialPages([...base, base[0]]), /Duplicate/);
  await assert.rejects(loadOfficialPages({ revision, fetchImpl: async (url) => Response.json(url.includes('/git/trees/') ? { truncated: true, tree: [] } : base) }), /Incomplete/);
});

test('fails closed on an unpinned source or failed download', async () => {
  await assert.rejects(loadOfficialPages({ revision: 'main' }), /pinned/);
  await assert.rejects(loadOfficialPages({ revision, fetchImpl: async () => new Response('', { status: 503 }) }), /503/);
});
