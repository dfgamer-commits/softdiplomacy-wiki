'use client';

import { useEffect, useRef } from 'react';
import { FLEET_CHAPTER_STOPS, FLEET_MOTION_QUERY, fleetMotion, fleetScrollProgress } from './airFleetMotion';

const aircraft = [
  {
    slug: 'Passenger_Plane', name: 'Passenger plane', role: 'Trade', kind: 'trade',
    description: 'The air twin of a trade ship: triangle marker, airport-to-airport routes, faster travel, and a global cap of 800.',
    stats: [['Naval twin', 'Trade ship'], ['Speed', '1.2×'], ['Global cap', '800']],
    route: 'M 80 230 C 300 230 320 62 555 92 S 880 190 1120 100',
    points: '17,0 -12,12 -12,-12',
  },
  {
    slug: 'Fighter_Jet', name: 'Fighter jet', role: 'Combat', kind: 'fighter',
    description: 'The air twin of a warship: pentagon marker, matching range, health, levels, fire rhythm, targeting, and capture behavior.',
    stats: [['Naval twin', 'Warship'], ['Speed', '1.2×'], ['Role', 'Combat']],
    route: 'M 80 175 C 260 175 365 315 600 240 S 900 60 1120 170',
    points: '17,0 5,15 -14,9 -14,-9 5,-15',
  },
  {
    slug: 'Attack_Helicopter', name: 'Attack helicopter', role: 'Insertion', kind: 'helicopter',
    description: 'The air twin of a transport ship: triangular marker, visible route trail and ETA, paid launch, troop delivery, and two active per player.',
    stats: [['Naval twin', 'Transport ship'], ['Speed', '1.2×'], ['Player limit', '2']],
    route: 'M 80 285 C 325 300 345 155 570 180 S 900 320 1120 265',
    points: '17,0 -12,12 -12,-12',
  },
];

export default function AirFleetStory() {
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const story = storyRef.current;
    const stage = stageRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!story || !stage || !viewport || !track) return;

    const media = window.matchMedia(FLEET_MOTION_QUERY);
    const paths = Array.from(story.querySelectorAll<SVGPathElement>('.fleet-route-progress'));
    const units = Array.from(story.querySelectorAll<SVGGElement>('.fleet-aircraft'));
    const chapters = Array.from(story.querySelectorAll<HTMLElement>('.fleet-chapter'));
    const controls = Array.from(story.querySelectorAll<HTMLButtonElement>('.fleet-chapter-button'));
    const lengths = paths.map((path) => path.getTotalLength());
    let frame = 0;
    let disposed = false;
    let observedWidth = 0;

    const update = () => {
      frame = 0;
      const enabled = story.classList.contains('fleet-scroll-enabled');
      const inset = parseFloat(window.getComputedStyle(stage).top) || 0;
      const progress = fleetScrollProgress(story.getBoundingClientRect().top, story.offsetHeight, stage.offsetHeight, inset);
      const motion = fleetMotion(progress);
      story.dataset.active = String(motion.active);
      story.style.setProperty('--fleet-progress', String(motion.progress));
      track.style.transform = enabled ? `translate3d(${-motion.chapter * viewport.clientWidth}px, 0, 0)` : '';
      chapters.forEach((chapter, index) => { chapter.inert = enabled && index !== motion.active; });
      controls.forEach((control, index) => {
        if (index === motion.active) control.setAttribute('aria-current', 'step');
        else control.removeAttribute('aria-current');
      });
      paths.forEach((path, index) => {
        const flight = enabled ? motion.flights[index] : 0.5;
        const length = lengths[index];
        const distance = length * flight;
        const point = path.getPointAtLength(distance);
        const before = path.getPointAtLength(Math.max(0, distance - 2));
        const after = path.getPointAtLength(Math.min(length, distance + 2));
        const heading = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
        path.style.strokeDashoffset = String(100 - flight * 100);
        units[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${heading})`);
      });
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const configure = () => {
      if (disposed) return;
      story.classList.toggle('fleet-scroll-enabled', media.matches);
      // Enlarged text and short panes must never clip the article links.
      if (media.matches && stage.scrollHeight > stage.clientHeight + 2) {
        story.classList.remove('fleet-scroll-enabled');
      }
      requestUpdate();
    };
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width !== observedWidth) {
        observedWidth = entry.contentRect.width;
        configure();
      }
    });
    observer.observe(story);
    configure();
    void document.fonts.ready.then(configure);
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', configure);
    media.addEventListener('change', configure);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', configure);
      media.removeEventListener('change', configure);
      window.cancelAnimationFrame(frame);
      chapters.forEach((chapter) => { chapter.inert = false; });
    };
  }, []);

  const goToChapter = (index: number) => {
    const story = storyRef.current;
    const stage = stageRef.current;
    if (!story || !stage) return;
    const inset = parseFloat(window.getComputedStyle(stage).top) || 0;
    window.scrollTo({
      top: window.scrollY + story.getBoundingClientRect().top - inset + FLEET_CHAPTER_STOPS[index] * (story.offsetHeight - stage.offsetHeight),
      behavior: 'smooth',
    });
  };

  return (
    <>
      <section className="fleet-story" ref={storyRef} data-active="0" aria-labelledby="fleet-heading">
        <div className="fleet-stage" ref={stageRef}>
          <header className="fleet-heading">
            <p className="eyebrow">Air command</p>
            <h2 id="fleet-heading">Three silhouettes. Familiar rules.</h2>
            <p>SoftDiplomacy extends the game with air equivalents of proven naval units instead of replacing the original economy or combat loop.</p>
          </header>

          <div className="fleet-scene" aria-hidden="true">
            <div className="fleet-map-texture" />
            <div className="fleet-direction"><span>Departure</span><span>Flight corridor →</span><span>Destination</span></div>
            <svg className="fleet-routes" viewBox="0 0 1200 360" fill="none">
              {aircraft.map((unit) => (
                <g key={unit.slug} className={`fleet-lane fleet-lane-${unit.kind}`}>
                  <path className="fleet-route-guide" d={unit.route} />
                  <path className="fleet-route-progress" d={unit.route} pathLength="100" />
                  <g className="fleet-aircraft">
                    <circle className="fleet-signal" r="29" />
                    <circle className="fleet-signal-inner" r="21" />
                    <path className="fleet-unit-tail" d="M -54 0 H -20" />
                    <polygon className="fleet-unit-body" points={unit.points} />
                  </g>
                </g>
              ))}
            </svg>
          </div>

          <div className="fleet-viewport" ref={viewportRef}>
            <div className="fleet-track" ref={trackRef}>
              {aircraft.map((unit, index) => (
                <article className={`fleet-chapter fleet-chapter-${unit.kind}`} key={unit.slug}>
                  <div className="fleet-chapter-title">
                    <p className="eyebrow">0{index + 1} / {unit.role}</p>
                    <h3>{unit.name}</h3>
                    <a href={`#/article/${unit.slug}`}>Explore {unit.name.toLowerCase()} <span aria-hidden="true">↗</span></a>
                  </div>
                  <div className="fleet-chapter-detail">
                    <p>{unit.description}</p>
                    <dl>{unit.stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <nav className="fleet-controls" aria-label="Air unit chapters">
            <div className="fleet-progress" aria-hidden="true"><span /></div>
            <p>Scroll down to fly right <span aria-hidden="true">→</span></p>
            <div className="fleet-chapter-buttons">
              {aircraft.map((unit, index) => <button className="fleet-chapter-button" type="button" key={unit.slug} onClick={() => goToChapter(index)} aria-label={`Show ${unit.name}`}><span>0{index + 1}</span> {unit.role}</button>)}
            </div>
            <button className="fleet-skip" type="button" onClick={() => { endRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }); endRef.current?.focus({ preventScroll: true }); }}>Skip animation ↓</button>
          </nav>
        </div>
      </section>
      <div ref={endRef} className="fleet-end" tabIndex={-1} aria-label="End of air unit animation" />
    </>
  );
}
