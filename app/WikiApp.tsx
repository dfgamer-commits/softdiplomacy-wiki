'use client';

import {
  FormEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import AirFleetStory from './AirFleetStory';
import CategoryStory, { CategoryAtlas } from './CategoryStory';

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
  | { kind: 'article'; slug: string; section?: string };

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

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
    const articlePath = hash.slice('article/'.length);
    const [slug, section] = articlePath.split('?section=', 2);
    return {
      kind: 'article',
      slug: decodeURIComponent(slug),
      section: section ? decodeURIComponent(section) : undefined,
    };
  }
  return { kind: 'home' };
}

function articleHref(slug: string) {
  return `#/article/${encodeURIComponent(slug)}`;
}

function articleSectionHref(slug: string, section: string) {
  return `${articleHref(slug)}?section=${encodeURIComponent(section)}`;
}

function headingsFromHtml(html: string): Heading[] {
  const headings: Heading[] = [];
  const pattern = /<h([1-6])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const text = match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    headings.push({ id: match[2], text, level: Number(match[1]) });
  }
  return headings;
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
        <nav className="sidebar-topics" aria-label="Wiki topics" tabIndex={0}>
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
            <p><strong>48-hour sync</strong><br />OpenFront source and wiki monitored.</p>
          </div>
        </nav>
      </aside>
      {children}
    </div>
  );
}

function CampaignStory() {
  const storyRef = useRef<HTMLElement>(null);
  const tradePathRef = useRef<SVGPathElement>(null);
  const fighterPathRef = useRef<SVGPathElement>(null);
  const helicopterPathRef = useRef<SVGPathElement>(null);
  const tradeUnitRef = useRef<SVGGElement>(null);
  const fighterUnitRef = useRef<SVGGElement>(null);
  const helicopterUnitRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const story = storyRef.current;
    if (!story) return;

    let frame = 0;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const moveUnit = (
      path: SVGPathElement | null,
      unit: SVGGElement | null,
      progress: number,
    ) => {
      if (!path || !unit) return;
      const length = path.getTotalLength();
      const distance = length * progress;
      const point = path.getPointAtLength(distance);
      const tangentDistance = Math.max(1, length * 0.012);
      const before = path.getPointAtLength(Math.max(0, distance - tangentDistance));
      const after = path.getPointAtLength(Math.min(length, distance + tangentDistance));
      const heading = Math.atan2(after.y - before.y, after.x - before.x) * (180 / Math.PI);
      unit.setAttribute(
        'transform',
        `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${heading.toFixed(2)})`,
      );
    };

    const update = () => {
      const rect = story.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / travel);
      const trade = clamp((progress - 0.12) / 0.26);
      const fighter = clamp((progress - 0.39) / 0.24);
      const helicopter = clamp((progress - 0.67) / 0.24);

      story.dataset.phase = String(Math.min(3, Math.floor(progress * 4)));
      story.style.setProperty('--story-progress', progress.toFixed(4));
      story.style.setProperty('--map-tilt', `${56 - progress * 14}deg`);
      story.style.setProperty('--map-turn', `${-13 + progress * 8}deg`);
      story.style.setProperty('--map-lift', `${8 - progress * 22}px`);
      story.style.setProperty('--map-scale', (0.92 + progress * 0.08).toFixed(3));
      story.style.setProperty('--trade-dash', (100 - trade * 100).toFixed(2));
      story.style.setProperty(
        '--fighter-dash',
        (100 - fighter * 100).toFixed(2),
      );
      story.style.setProperty(
        '--helicopter-dash',
        (100 - helicopter * 100).toFixed(2),
      );
      moveUnit(tradePathRef.current, tradeUnitRef.current, trade);
      moveUnit(fighterPathRef.current, fighterUnitRef.current, fighter);
      moveUnit(
        helicopterPathRef.current,
        helicopterUnitRef.current,
        helicopter,
      );
      frame = 0;
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="campaign-story" ref={storyRef} data-phase="0">
      <div className="campaign-stage">
        <div className="campaign-heading">
          <p className="eyebrow">One connected front</p>
          <p>Scroll to run the operation</p>
        </div>
        <div className="campaign-scene" aria-hidden="true">
          <div className="campaign-glow" />
          <div className="command-map">
            <div className="command-map-texture" />
            <div className="command-grid" />
            <svg className="campaign-routes" viewBox="0 0 1000 560">
              <path className="route route-rail" d="M 80 440 C 190 410 245 380 305 368" />
              <path ref={tradePathRef} className="route route-trade" pathLength="100" d="M 280 375 Q 540 92 790 174" />
              <path ref={fighterPathRef} className="route route-fighter" pathLength="100" d="M 840 405 Q 690 230 570 210" />
              <path ref={helicopterPathRef} className="route route-helicopter" pathLength="100" d="M 480 430 Q 310 310 180 198" />
              <path className="front-line" d="M 94 185 Q 155 238 208 180 T 330 198" />
              <g ref={tradeUnitRef} className="campaign-svg-unit campaign-svg-unit-trade">
                <circle className="marker-signal" r="17" />
                <path className="marker-trail" d="M -36 0 H -13" />
                <polygon className="marker-body" points="13,0 -10,10 -10,-10" />
              </g>
              <g ref={fighterUnitRef} className="campaign-svg-unit campaign-svg-unit-fighter">
                <circle className="marker-signal" r="18" />
                <path className="marker-trail" d="M -39 0 H -14" />
                <polygon className="marker-body" points="14,0 4,12 -11,7 -11,-7 4,-12" />
              </g>
              <g ref={helicopterUnitRef} className="campaign-svg-unit campaign-svg-unit-helicopter">
                <circle className="marker-signal" r="17" />
                <path className="marker-trail" d="M -42 0 H -13" />
                <polygon className="marker-body" points="13,0 -10,10 -10,-10" />
              </g>
            </svg>
            <span className="map-node node-city"><i>▦</i><small>CAPITAL</small></span>
            <span className="map-node node-airport"><i>◆</i><small>AIRPORT</small></span>
            <span className="map-node node-port"><i>●</i><small>PORT</small></span>
            <span className="map-node node-target"><i>×</i><small>HOSTILE</small></span>
            <span className="impact-pulse" />
            <div className="campaign-map-label"><span>WORLD / LIVE</span><strong>THEATER 01</strong></div>
          </div>
          <div className="map-shadow" />
        </div>
        <div className="campaign-telemetry" aria-hidden="true">
          <span>OPENFRONT SYSTEM</span>
          <span className="telemetry-state telemetry-state-0"><b>FOUNDATION</b><i>Condition: original systems stay authoritative</i><em>Result: air power adds choices without replacing the base loop</em></span>
          <span className="telemetry-state telemetry-state-1"><b>AIR TRADE</b><i>Condition: eligible active airports</i><em>Result: gold is paid only after arrival</em></span>
          <span className="telemetry-state telemetry-state-2"><b>INTERCEPT</b><i>Condition: a valid hostile aircraft enters range</i><em>Result: fire a shell, confirm the hit, resume patrol</em></span>
          <span className="telemetry-state telemetry-state-3"><b>INSERTION</b><i>Condition: paid launch and real troop payload</i><em>Result: carrier is consumed; land combat begins</em></span>
          <span>SD / AIR COMMAND</span>
        </div>
      </div>

      <div className="campaign-steps">
        <article className="campaign-step">
          <span>01 / TERRITORY</span>
          <h2>Build on the rules that already work.</h2>
          <p>OpenFront’s land, economy, rail, port, combat, and diplomacy systems stay authoritative. Air power starts from that same foundation.</p>
          <a href={articleHref('Base_Mechanics_Parity')}>Review base parity →</a>
        </article>
        <article className="campaign-step">
          <span>02 / CONNECT</span>
          <h2>Link the airport. Open the route.</h2>
          <p>Rails connect to airports as they do to ports. Passenger planes then carry trade between airports at 1.2× trade-ship speed.</p>
          <a href={articleHref('Passenger_Plane')}>Passenger plane →</a>
        </article>
        <article className="campaign-step">
          <span>03 / PROTECT</span>
          <h2>Control the sky with familiar combat.</h2>
          <p>Fighter jets inherit the warship model—health, levels, range, targeting, fire rhythm, and capture rules—with the documented air adjustment.</p>
          <a href={articleHref('Fighter_Jet')}>Fighter jet →</a>
        </article>
        <article className="campaign-step">
          <span>04 / DEPLOY</span>
          <h2>Move troops beyond the shoreline.</h2>
          <p>Attack helicopters mirror transport ships from the air, including a readable trail and arrival timing, with a paid launch and two-unit limit.</p>
          <a href={articleHref('Attack_Helicopter')}>Attack helicopter →</a>
        </article>
      </div>
    </section>
  );
}

function Home({ index }: { index: PageIndex[] }) {
  const homeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const home = homeRef.current;
    if (!home) return;

    const targets = Array.from(
      home.querySelectorAll<HTMLElement>('.home-scroll-reveal'),
    );
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    home.classList.add('home-motion-ready');

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="home-page" ref={homeRef}>
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

      <CampaignStory />

      <section className="mission-strip home-scroll-reveal">
        <div><span>01</span><p><strong>Same foundation</strong>Original OpenFront systems remain the baseline.</p></div>
        <div><span>02</span><p><strong>Air twins</strong>Each aircraft follows its matching naval role.</p></div>
        <div><span>03</span><p><strong>Verified regularly</strong>Source, wiki, tests, and builds checked every 48 hours.</p></div>
      </section>

      <Shell index={index}>
        <div className="home-content">
          <AirFleetStory />
          <CategoryAtlas />

          <section className="parity-panel home-scroll-reveal">
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

const AIR_TOPIC_CARDS = [
  {
    slug: 'Airport_SoftDiplomacy',
    label: 'Airport',
    role: 'Build the network',
    kind: 'airport',
  },
  {
    slug: 'Passenger_Plane',
    label: 'Passenger plane',
    role: 'Run air trade',
    kind: 'plane',
  },
  {
    slug: 'Fighter_Jet',
    label: 'Fighter jet',
    role: 'Control the sky',
    kind: 'jet',
  },
  {
    slug: 'Attack_Helicopter',
    label: 'Attack helicopter',
    role: 'Deploy troops',
    kind: 'helicopter',
  },
] as const;

function AirTopicDeck() {
  return (
    <section className="air-topic-deck" aria-labelledby="air-topic-title">
      <div className="air-topic-heading">
        <p className="eyebrow">Choose a flight path</p>
        <h2 id="air-topic-title">Continue through air command</h2>
      </div>
      <div className="air-topic-grid">
        {AIR_TOPIC_CARDS.map((topic, index) => (
          <a
            className={`air-topic-card air-topic-card-${topic.kind}`}
            href={articleHref(topic.slug)}
            key={topic.slug}
            style={{ '--topic-order': index } as React.CSSProperties}
          >
            <span className="air-topic-index">0{index + 1}</span>
            <span className="air-topic-symbol" aria-hidden="true">
              {topic.kind === 'airport' ? <span className="airport-topic-mark">◆</span> : <Mark kind={topic.kind} />}
            </span>
            <small>{topic.role}</small>
            <strong>{topic.label}</strong>
            <span className="air-topic-flight" aria-hidden="true"><i /></span>
            <span className="air-topic-arrow" aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Article({ index, slug, section }: { index: PageIndex[]; slug: string; section?: string }) {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [error, setError] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    fetch(`/content/pages/${encodeURIComponent(slug)}.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Page not found');
        return response.json() as Promise<WikiPage>;
      })
      .then(setPage)
      .catch(() => setError(true));
  }, [slug]);

  useEffect(() => {
    if (!page || !section) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page, section]);

  const articleHeadings = useMemo(
    () => (page ? headingsFromHtml(page.html) : []),
    [page],
  );

  useEffect(() => {
    const article = articleRef.current;
    if (!page || !article) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = Array.from(
      article.querySelectorAll<HTMLElement>(
        '.wiki-content > *, .air-topic-deck, .air-topic-card, .article-license',
      ),
    );

    revealTargets.forEach((target, position) => {
      target.classList.add('article-reveal');
      target.style.setProperty('--reveal-order', String(Math.min(position, 8)));
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
    }

    const revealObserver = reduceMotion || !('IntersectionObserver' in window)
      ? null
      : new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver?.unobserve(entry.target);
          });
        }, { rootMargin: '0px 0px -9% 0px', threshold: 0.06 });

    revealTargets.forEach((target) => revealObserver?.observe(target));

    let animationFrame = 0;
    const updateReadingState = () => {
      animationFrame = 0;
      const bounds = article.getBoundingClientRect();
      const readableDistance = Math.max(article.offsetHeight - window.innerHeight * 0.58, 1);
      const progress = Math.min(1, Math.max(0, (72 - bounds.top) / readableDistance));
      article.style.setProperty('--reading-progress', String(progress));

      const headingElements = articleHeadings
        .map((heading) => document.getElementById(heading.id))
        .filter((heading): heading is HTMLElement => Boolean(heading));
      let currentSection = headingElements[0]?.id ?? '';
      headingElements.forEach((heading) => {
        if (heading.getBoundingClientRect().top <= 150) currentSection = heading.id;
      });
      article.parentElement?.querySelectorAll<HTMLElement>('.toc a[data-section]').forEach((link) => {
        const isActive = link.dataset.section === currentSection;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    const requestReadingUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateReadingState);
    };

    updateReadingState();
    window.addEventListener('scroll', requestReadingUpdate, { passive: true });
    window.addEventListener('resize', requestReadingUpdate);

    return () => {
      revealObserver?.disconnect();
      window.removeEventListener('scroll', requestReadingUpdate);
      window.removeEventListener('resize', requestReadingUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [articleHeadings, page]);

  const interceptLinks = (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    const raw = anchor.getAttribute('href');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return;
    event.preventDefault();
    const [targetSlug, targetSection] = raw.slice(1).split('#', 2);
    window.location.hash = `/article/${encodeURIComponent(targetSlug)}`;
    if (targetSection) {
      window.location.hash = `/article/${encodeURIComponent(targetSlug)}?section=${encodeURIComponent(targetSection)}`;
    }
  };

  if (error) {
    return <Shell index={index}><main className="content-pane"><div className="empty-state"><span>404</span><h1>Page not found</h1><a href="#/all">Return to all pages</a></div></main></Shell>;
  }
  if (!page) {
    return <Shell index={index}><main className="content-pane"><div className="loading-card"><span /><span /><span /></div></main></Shell>;
  }

  return (
    <Shell index={index}>
      <main className={`content-pane article-layout${page.softDiplomacy ? ' article-layout-air' : ''}`}>
        <article ref={articleRef} className="wiki-article">
          <div className="article-reading-progress" aria-hidden="true"><span /></div>
          <p className="breadcrumbs"><a href="#/">Home</a><span>/</span><a href="#/all">All pages</a><span>/</span>{page.title}</p>
          <div className="article-title-row">
            <div><p className="eyebrow">{page.softDiplomacy ? 'SoftDiplomacy expansion' : 'OpenFront reference'}</p><h1>{page.title}</h1></div>
            {page.softDiplomacy && <span className="air-badge">AIR</span>}
          </div>
          {page.cats?.length > 0 && <div className="tag-row">{page.cats.filter((cat) => !/stub|broken|all pages/i.test(cat)).slice(0, 6).map((cat) => <span key={cat}>{cat}</span>)}</div>}
          <div className="rule" />
          <CategoryStory slug={slug} />
          <div className="wiki-content" onClick={interceptLinks} dangerouslySetInnerHTML={{ __html: page.html }} />
          {slug === 'Air_Units' && <AirTopicDeck />}
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
        {articleHeadings.length > 1 && (
          <aside className="toc"><p className="eyebrow">On this page</p><ul>{articleHeadings.map((heading) => <li className={heading.level > 1 ? 'toc-sub' : ''} key={heading.id}><a data-section={heading.id} href={articleSectionHref(slug, heading.id)}>{heading.text}</a></li>)}</ul></aside>
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
    const syncRoute = () => {
      const nextRoute = parseRoute();
      const viewTransitionDocument = document as ViewTransitionDocument;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (viewTransitionDocument.startViewTransition && !reduceMotion) {
        viewTransitionDocument.startViewTransition(() => {
          flushSync(() => setRoute(nextRoute));
        });
      } else {
        setRoute(nextRoute);
      }
    };
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

  const routeKey = route.kind === 'article' ? `article-${route.slug}` : route.kind;

  return (
    <div className="site-root">
      <Header onSearch={search} />
      <div className="route-surface" key={routeKey}>
        {route.kind === 'home' && <Home index={index} />}
        {route.kind === 'all' && <AllPages index={index} initialQuery={searchQuery} />}
        {route.kind === 'article' && <Article index={index} slug={route.slug} section={route.section} />}
        <footer className="site-footer">
          <div><strong>SoftDiplomacy Wiki</strong><span>Independent community documentation.</span></div>
          <div><a href="https://github.com/dfgamer-commits/soft-diplomacy" target="_blank" rel="noreferrer">Game repository</a><a href="https://openfront.wiki/" target="_blank" rel="noreferrer">OpenFront community wiki</a></div>
        </footer>
      </div>
    </div>
  );
}
