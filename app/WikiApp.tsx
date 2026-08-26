'use client';

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';

type Heading = { id: string; text: string; level: number };
type PageIndex = {
  slug: string;
  title: string;
  cats: string[];
  headings: Heading[];
  source?: string;
  sourceUrl?: string;
  softDiplomacy?: boolean;
  summary?: string;
};
type WikiPage = PageIndex & { html: string };
type Route =
  | { kind: 'home' }
  | { kind: 'all' }
  | { kind: 'article'; slug: string };

const AIR_SLUGS = [
  'Air_Units',
  'Airport_SoftDiplomacy',
  'Passenger_Plane',
  'Fighter_Jet',
  'Attack_Helicopter',
];

const PRIMARY_LINKS = [
  ['Combat', 'Combat'],
  ['Gold', 'Gold'],
  ['Buildings', 'Buildings'],
  ['Warship', 'Warship'],
  ['Trade ship', 'Trade_Ship'],
  ['Transport ship', 'Transport_Ship'],
  ['Railroad', 'Railroad'],
];

function parseRoute(): Route {
  if (typeof window === 'undefined') return { kind: 'home' };
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { kind: 'home' };
  if (hash === 'all') return { kind: 'all' };
  if (hash.startsWith('article/')) {
    return {
      kind: 'article',
      slug: decodeURIComponent(hash.slice('article/'.length)),
    };
  }
  return { kind: 'home' };
}

function articleHref(slug: string) {
  return `#/article/${encodeURIComponent(slug)}`;
}

function Mark({ kind }: { kind: 'plane' | 'jet' | 'helicopter' }) {
  return (
    <span className={`unit-mark unit-mark--${kind}`} aria-hidden="true">
      <span />
    </span>
  );
}

function Header({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(value);
  };

  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="SoftDiplomacy Wiki home">
        <span className="brand-mark"><span>SD</span></span>
        <span className="brand-copy">
          <strong>SoftDiplomacy</strong>
          <small>Field Manual</small>
        </span>
      </a>
      <nav className="top-nav" aria-label="Primary navigation">
        <a href="#/">Home</a>
        <a href="#/all">All pages</a>
        <a className="air-nav" href={articleHref('Air_Units')}>Air units</a>
      </nav>
      <form className="header-search" onSubmit={submit}>
        <span aria-hidden="true">⌕</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search the field manual"
          aria-label="Search wiki pages"
        />
        <kbd>Enter</kbd>
      </form>
    </header>
  );
}

function Shell({
  children,
  index,
}: {
  children: React.ReactNode;
  index: PageIndex[];
}) {
  return (
    <div className="page-shell">
      <aside className="sidebar">
        <p className="eyebrow">Base game</p>
        <ul>
          {PRIMARY_LINKS.map(([label, slug]) => (
            <li key={slug}><a href={articleHref(slug)}>{label}</a></li>
          ))}
        </ul>
        <p className="eyebrow sidebar-air">Air expansion</p>
        <ul>
          {AIR_SLUGS.map((slug) => {
            const page = index.find((item) => item.slug === slug);
            return <li key={slug}><a href={articleHref(slug)}>{page?.title ?? slug.replaceAll('_', ' ')}</a></li>;
          })}
        </ul>
        <div className="sync-card">
          <span className="live-dot" />
          <p><strong>36-hour sync</strong><br />OpenFront source and wiki monitored.</p>
        </div>
      </aside>
      {children}
    </div>
  );
}

function Home({ index }: { index: PageIndex[] }) {
  return (
    <main>
      <section className="hero">
        <div className="flight-lines" aria-hidden="true">
          <span className="line-one" />
          <span className="line-two" />
          <span className="line-three" />
        </div>
        <div className="hero-copy">
          <p className="status-pill"><span /> Community project · current audit</p>
          <h1>Command the map.<br /><em>Own the sky.</em></h1>
          <p className="hero-lede">
            The OpenFront field manual, expanded for SoftDiplomacy’s airports,
            passenger planes, fighter jets, and attack helicopters.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={articleHref('Air_Units')}>Explore air units <span>→</span></a>
            <a className="button button-secondary" href="#/all">Browse {index.length || 'all'} pages</a>
          </div>
        </div>
        <div className="radar" aria-label="Air unit silhouettes">
          <div className="radar-ring radar-ring-one" />
          <div className="radar-ring radar-ring-two" />
          <div className="radar-cross radar-cross-one" />
          <div className="radar-cross radar-cross-two" />
          <div className="radar-sweep" />
          <div className="radar-unit radar-unit-plane"><Mark kind="plane" /><small>TRADE · 120%</small></div>
          <div className="radar-unit radar-unit-jet"><Mark kind="jet" /><small>FIGHTER · 120%</small></div>
          <div className="radar-unit radar-unit-heli"><Mark kind="helicopter" /><small>SPEC OPS · 2 MAX</small></div>
        </div>
      </section>

      <section className="mission-strip">
        <div><span>01</span><p><strong>Same foundation</strong>Original OpenFront systems remain the baseline.</p></div>
        <div><span>02</span><p><strong>Air twins</strong>Each aircraft follows its matching naval role.</p></div>
        <div><span>03</span><p><strong>Verified regularly</strong>Source, wiki, tests, and builds checked every 36 hours.</p></div>
      </section>

      <Shell index={index}>
        <div className="home-content">
          <section className="section-heading">
            <p className="eyebrow">Air command</p>
            <h2>Three silhouettes. Familiar rules.</h2>
            <p>SoftDiplomacy extends the game with air equivalents of proven naval units instead of replacing the original economy or combat loop.</p>
          </section>
          <div className="unit-grid">
            <a className="unit-card" href={articleHref('Passenger_Plane')}>
              <div className="card-mark"><Mark kind="plane" /></div>
              <span className="card-number">A–01</span>
              <h3>Passenger plane</h3>
              <p>The air twin of a trade ship: triangle marker, airport-to-airport routes, faster travel, and a global cap of 800.</p>
              <div className="stat-row"><span>Role <strong>Trade</strong></span><span>Speed <strong>1.2×</strong></span></div>
            </a>
            <a className="unit-card unit-card-featured" href={articleHref('Fighter_Jet')}>
              <div className="card-mark"><Mark kind="jet" /></div>
              <span className="card-number">A–02</span>
              <h3>Fighter jet</h3>
              <p>The air twin of a warship: pentagon marker, matching range, health, levels, fire rhythm, targeting, and capture behavior.</p>
              <div className="stat-row"><span>Role <strong>Combat</strong></span><span>Speed <strong>1.2×</strong></span></div>
            </a>
            <a className="unit-card" href={articleHref('Attack_Helicopter')}>
              <div className="card-mark"><Mark kind="helicopter" /></div>
              <span className="card-number">A–03</span>
              <h3>Attack helicopter</h3>
              <p>The air twin of a transport ship: triangular marker, visible route trail and ETA, paid launch, troop delivery, and two active per player.</p>
              <div className="stat-row"><span>Role <strong>Insertion</strong></span><span>Limit <strong>2</strong></span></div>
            </a>
          </div>

          <section className="parity-panel">
            <div><p className="eyebrow">Design rule</p><h2>Additive, not disruptive.</h2></div>
            <p>Existing OpenFront mechanics stay authoritative. Airports and aircraft are added beside ports and ships, with explicit parity tests protecting the base systems from unintended changes.</p>
            <a href={articleHref('Base_Mechanics_Parity')}>Read the parity policy →</a>
          </section>
        </div>
      </Shell>
    </main>
  );
}

function AllPages({ index, initialQuery = '' }: { index: PageIndex[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return index;
    return index.filter((page) =>
      `${page.title} ${page.slug} ${(page.cats || []).join(' ')}`.toLowerCase().includes(normalized),
    );
  }, [index, query]);
  const groups = useMemo(() => {
    const grouped = new Map<string, PageIndex[]>();
    filtered.forEach((page) => {
      const letter = /^[A-Z0-9]/i.test(page.title) ? page.title[0].toUpperCase() : '#';
      grouped.set(letter, [...(grouped.get(letter) || []), page]);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <Shell index={index}>
      <main className="content-pane all-pages">
        <p className="breadcrumbs"><a href="#/">Home</a><span>/</span>All pages</p>
        <div className="article-title-row">
          <div><p className="eyebrow">Knowledge base</p><h1>All pages</h1></div>
          <span className="page-count">{filtered.length} entries</span>
        </div>
        <label className="page-search">
          <span>⌕</span>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search units, mechanics, maps, guides…" />
        </label>
        <div className="alphabet">
          {groups.map(([letter]) => <a key={letter} href={`#group-${letter}`}>{letter}</a>)}
        </div>
        <div className="page-groups">
          {groups.map(([letter, pages]) => (
            <section key={letter} id={`group-${letter}`}>
              <h2>{letter}</h2>
              <div className="page-link-grid">
                {pages.map((page) => (
                  <a className={page.softDiplomacy ? 'soft-page' : ''} key={page.slug} href={articleHref(page.slug)}>
                    <strong>{page.title}</strong>
                    {page.softDiplomacy && <span>SoftDiplomacy</span>}
                    {page.summary && <small>{page.summary}</small>}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </Shell>
  );
}

function Article({ index, slug }: { index: PageIndex[]; slug: string }) {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(`/content/pages/${encodeURIComponent(slug)}.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Page not found');
        return response.json() as Promise<WikiPage>;
      })
      .then(setPage)
      .catch(() => setError(true));
  }, [slug]);

  const interceptLinks = (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    const raw = anchor.getAttribute('href');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return;
    event.preventDefault();
    const [targetSlug] = raw.slice(1).split('#');
    window.location.hash = `/article/${encodeURIComponent(targetSlug)}`;
  };

  if (error) {
    return <Shell index={index}><main className="content-pane"><div className="empty-state"><span>404</span><h1>Page not found</h1><a href="#/all">Return to all pages</a></div></main></Shell>;
  }
  if (!page) {
    return <Shell index={index}><main className="content-pane"><div className="loading-card"><span /><span /><span /></div></main></Shell>;
  }

  return (
    <Shell index={index}>
      <main className="content-pane article-layout">
        <article>
          <p className="breadcrumbs"><a href="#/">Home</a><span>/</span><a href="#/all">All pages</a><span>/</span>{page.title}</p>
          <div className="article-title-row">
            <div><p className="eyebrow">{page.softDiplomacy ? 'SoftDiplomacy expansion' : 'OpenFront reference'}</p><h1>{page.title}</h1></div>
            {page.softDiplomacy && <span className="air-badge">AIR</span>}
          </div>
          {page.cats?.length > 0 && <div className="tag-row">{page.cats.filter((cat) => !/stub|broken|all pages/i.test(cat)).slice(0, 6).map((cat) => <span key={cat}>{cat}</span>)}</div>}
          <div className="rule" />
          <div className="wiki-content" onClick={interceptLinks} dangerouslySetInnerHTML={{ __html: page.html }} />
          <footer className="article-license">
            {page.source === 'liquipedia' ? (
              <>Material sourced from <a href={page.sourceUrl} target="_blank" rel="noreferrer">Liquipedia</a> under <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.</>
            ) : page.softDiplomacy ? (
              <>SoftDiplomacy documentation. Base-game comparisons link back to the <a href="https://openfront.wiki/" target="_blank" rel="noreferrer">OpenFront community wiki</a>.</>
            ) : (
              <>Content adapted from the <a href={`https://openfront.wiki/${page.slug}`} target="_blank" rel="noreferrer">OpenFront community wiki</a> under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</>
            )}
          </footer>
        </article>
        {page.headings?.length > 1 && (
          <aside className="toc"><p className="eyebrow">On this page</p><ul>{page.headings.slice(0, 16).map((heading) => <li className={heading.level > 2 ? 'toc-sub' : ''} key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ul></aside>
        )}
      </main>
    </Shell>
  );
}

export default function WikiApp() {
  const [route, setRoute] = useState<Route>({ kind: 'home' });
  const [index, setIndex] = useState<PageIndex[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const syncRoute = () => setRoute(parseRoute());
    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    fetch('/content/index.json')
      .then((response) => response.json() as Promise<PageIndex[]>)
      .then(setIndex)
      .catch(() => setIndex([]));
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const search = (value: string) => {
    setSearchQuery(value);
    window.location.hash = '/all';
  };

  return (
    <div className="site-root">
      <Header onSearch={search} />
      {route.kind === 'home' && <Home index={index} />}
      {route.kind === 'all' && <AllPages index={index} initialQuery={searchQuery} />}
      {route.kind === 'article' && <Article key={route.slug} index={index} slug={route.slug} />}
      <footer className="site-footer">
        <div><strong>SoftDiplomacy Wiki</strong><span>Independent community documentation.</span></div>
        <div><a href="https://github.com/dfgamer-commits/soft-diplomacy" target="_blank" rel="noreferrer">Game repository</a><a href="https://openfront.wiki/" target="_blank" rel="noreferrer">OpenFront community wiki</a></div>
      </footer>
    </div>
  );
}
