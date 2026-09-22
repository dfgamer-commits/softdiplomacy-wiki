import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkHeadingId } from 'remark-custom-heading-id';

const requiredPages = ['Combat', 'Gold', 'Buildings', 'Port', 'Warship', 'Trade_Ship', 'Transport_Ship'];
let processor;

export function validateOfficialPages(pages) {
  if (!Array.isArray(pages)) throw new Error('Official wiki source must be a page array.');
  const slugs = new Set();
  for (const page of pages) {
    if (!page.slug || !page.title || typeof page.html !== 'string') {
      throw new Error('Official wiki source has an invalid article.');
    }
    if (slugs.has(page.slug)) throw new Error(`Duplicate official slug: ${page.slug}`);
    slugs.add(page.slug);
  }
  for (const slug of requiredPages) {
    if (!slugs.has(slug)) throw new Error(`Incomplete official source: missing ${slug}. No content should be written.`);
  }
  return pages;
}

export async function renderWikiMarkdown(slug, markdown) {
  const { data, content } = matter(markdown);
  if (typeof data.title !== 'string' || typeof data.section !== 'string') {
    throw new Error(`Invalid official Markdown metadata: ${slug}`);
  }
  // Use the official Astro renderer and its explicit-heading-ID plugin. Keep
  // raw tables, MathML, images, citations, and maintenance notices intact.
  processor ??= createMarkdownProcessor({ remarkPlugins: [remarkHeadingId] });
  const rendered = await (await processor).render(content);
  if (rendered.code.includes('__ASTRO_IMAGE_')) {
    throw new Error(`Unsupported bundled image in ${slug}; do not publish a broken image.`);
  }
  return {
    slug,
    title: data.title,
    section: data.section,
    cats: data.cats || [],
    ...(data.source ? { source: data.source } : {}),
    ...(data.sourceUrl ? { sourceUrl: data.sourceUrl } : {}),
    headings: rendered.metadata.headings.map(({ slug: id, text, depth: level }) => ({ id, text, level })),
    html: rendered.code,
  };
}

export async function loadOfficialPages({ revision, sourcePath, fetchImpl = fetch } = {}) {
  if (sourcePath) {
    return validateOfficialPages(JSON.parse(await readFile(path.resolve(sourcePath), 'utf8')));
  }
  if (!/^[a-f0-9]{40}$/.test(revision || '')) {
    throw new Error('A pinned 40-character official wiki revision is required.');
  }
  async function download(url, asJson = false) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Official wiki download failed (${response.status}): ${url}`);
    return asJson ? response.json() : response.text();
  }
  const rawRoot = `https://raw.githubusercontent.com/openfrontio/wiki/${revision}/`;
  const [tree, masters] = await Promise.all([
    download(`https://api.github.com/repos/openfrontio/wiki/git/trees/${revision}?recursive=1`, true),
    download(`${rawRoot}src/data/pages.json`, true),
  ]);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete official repository tree.');
  const files = tree.tree.filter(({ type, path: file }) => type === 'blob' && /^src\/content\/wiki\/[^/]+\.md$/.test(file));
  // Older revisions held everything in JSON. Newer revisions split game
  // articles into Markdown and retain only Masters pages in pages.json.
  const rendered = new Array(files.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor++;
      const file = files[index].path;
      const slug = path.posix.basename(file, '.md');
      const url = rawRoot + file.split('/').map(encodeURIComponent).join('/');
      rendered[index] = await renderWikiMarkdown(slug, await download(url));
    }
  }));
  return validateOfficialPages([...rendered, ...masters]).sort((a, b) => a.title.localeCompare(b.title));
}
