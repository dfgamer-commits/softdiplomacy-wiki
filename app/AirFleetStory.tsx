'use client';

import { useEffect, useRef } from 'react';
import { FLEET_CHAPTER_STOPS, FLEET_MISSIONS, FLEET_MOTION_QUERY, fleetMission, fleetMotion, fleetScrollProgress } from './airFleetMotion';

const aircraft = [
  {
    slug: 'Passenger_Plane', name: 'Passenger plane', role: 'Trade', kind: 'trade',
    description: 'The air twin of a trade ship: triangle marker, airport-to-airport routes, faster travel, and a global cap of 800.',
    stats: [['Naval twin', 'Trade ship'], ['Speed', '1.2×'], ['Global cap', '800']],
    route: 'M 130 230 C 350 230 370 100 600 100 S 850 230 1070 230',
    points: '17,0 -12,12 -12,-12',
  },
  {
    slug: 'Fighter_Jet', name: 'Fighter jet', role: 'Combat', kind: 'fighter',
    description: 'The air twin of a warship: pentagon marker, matching range, health, levels, fire rhythm, targeting, and capture behavior.',
    stats: [['Naval twin', 'Warship'], ['Speed', '1.2×'], ['Role', 'Combat']],
    route: 'M 130 230 C 330 230 500 170 740 170',
    points: '17,0 5,15 -14,9 -14,-9 5,-15',
  },
  {
    slug: 'Attack_Helicopter', name: 'Attack helicopter', role: 'Insertion', kind: 'helicopter',
    description: 'The air twin of a transport ship: triangular marker, visible route trail and ETA, paid launch, troop delivery, and two active per player.',
    stats: [['Naval twin', 'Transport ship'], ['Speed', '1.2×'], ['Player limit', '2']],
    route: 'M 130 230 C 340 230 425 125 635 130 S 855 220 1070 220',
    points: '17,0 -12,12 -12,-12',
  },
];

function AirportNode({ x, y, label }: { x: number; y: number; label: string }) {
  return <g className="fleet-airport-node" transform={`translate(${x} ${y})`}>
    <circle r="35" />
    <polygon points="0,-23 23,0 0,23 -23,0" />
    <text y="62" textAnchor="middle">{label}</text>
  </g>;
}

export default function AirFleetStory() {
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const staticChapterRef = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

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
    const lanes = Array.from(story.querySelectorAll<SVGGElement>('.fleet-lane'));
    const missionTitle = story.querySelector<HTMLElement>('.fleet-mission-title');
    const missionCaption = story.querySelector<HTMLElement>('.fleet-mission-caption');
    const milestones = Array.from(story.querySelectorAll<HTMLElement>('.fleet-milestones li'));
    const enemy = story.querySelector<SVGGElement>('.fleet-enemy');
    const shell = story.querySelector<SVGCircleElement>('.fleet-shell');
    const impactRing = story.querySelector<SVGCircleElement>('.fleet-impact');
    const troops = story.querySelector<SVGGElement>('.fleet-landed-troops');
    const lengths = paths.map((path) => path.getTotalLength());
    let frame = 0;
    let disposed = false;
    let observedWidth = 0;

    const update = () => {
      frame = 0;
      const enabled = story.classList.contains('fleet-scroll-enabled');
      const inset = parseFloat(window.getComputedStyle(stage).top) || 0;
      const progress = fleetScrollProgress(story.getBoundingClientRect().top, story.offsetHeight, stage.offsetHeight, inset);
      const motion = fleetMotion(enabled ? progress : FLEET_CHAPTER_STOPS[staticChapterRef.current]);
      story.dataset.active = String(motion.active);
      story.style.setProperty('--fleet-progress', String(motion.progress));
      track.style.transform = enabled ? `translate3d(${-motion.chapter * viewport.clientWidth}px, 0, 0)` : '';
      chapters.forEach((chapter, index) => { chapter.inert = enabled && index !== motion.active; });
      controls.forEach((control, index) => {
        if (index === motion.active) control.setAttribute('aria-current', 'step');
        else control.removeAttribute('aria-current');
      });
      const activeMission = FLEET_MISSIONS[motion.active];
      const activeState = fleetMission(motion.active, enabled ? motion.flights[motion.active] : 1);
      if (missionTitle) missionTitle.textContent = activeMission.title;
      if (missionCaption) missionCaption.textContent = activeMission.captions[activeState.phase];
      milestones.forEach((step, index) => {
        step.textContent = activeMission.steps[index];
        step.dataset.state = index < activeState.phase ? 'complete' : index === activeState.phase ? 'current' : 'next';
        if (index === activeState.phase) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
      paths.forEach((path, index) => {
        const state = fleetMission(index, enabled ? motion.flights[index] : 1);
        const flight = state.flight;
        const length = lengths[index];
        const distance = length * flight;
        const point = path.getPointAtLength(distance);
        const before = path.getPointAtLength(Math.max(0, distance - 2));
        const after = path.getPointAtLength(Math.min(length, distance + 2));
        const heading = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
        path.style.strokeDashoffset = String(100 - flight * 100);
        units[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${heading})`);
        units[index]?.style.setProperty('opacity', String(state.aircraftOpacity));
        lanes[index]?.classList.toggle('is-engaging', state.inCombat);
        lanes[index]?.style.setProperty('--arrival', String(state.arrival));
        lanes[index]?.style.setProperty('--gold-opacity', String(state.goldOpacity));
        lanes[index]?.style.setProperty('--range-opacity', state.flight === 1 ? '1' : '0');
        if (index === 1) {
          enemy?.setAttribute('transform', `translate(${1080 - state.enemyFlight * 210} 170)`);
          enemy?.style.setProperty('opacity', String(state.targetOpacity));
          shell?.setAttribute('cx', String(740 + 130 * state.projectile));
          shell?.style.setProperty('opacity', String(state.projectileOpacity));
          impactRing?.setAttribute('r', String(12 + state.impact * 48));
          impactRing?.style.setProperty('opacity', String(state.impactOpacity));
        }
        if (index === 2) {
          troops?.style.setProperty('opacity', String(state.troopsOpacity));
          troops?.setAttribute('transform', `translate(${1070 + state.troopsOpacity * 18} 220)`);
        }
      });
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    refreshRef.current = requestUpdate;
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
      refreshRef.current = () => {};
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
    if (!story.classList.contains('fleet-scroll-enabled')) {
      staticChapterRef.current = index;
      refreshRef.current();
      return;
    }
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

          <div className="fleet-mission">
            <div className="fleet-mission-label"><strong className="fleet-mission-title">{FLEET_MISSIONS[0].title}</strong><span>Illustrative sequence · not to scale</span></div>
            <div className="fleet-scene" aria-hidden="true">
              <div className="fleet-map-texture" />
              <svg className="fleet-routes" viewBox="0 0 1200 350" fill="none">
              {aircraft.map((unit) => (
                <g key={unit.slug} className={`fleet-lane fleet-lane-${unit.kind}`}>
                  {unit.kind === 'trade' && <>
                    <AirportNode x={130} y={230} label="Origin airport" />
                    <AirportNode x={1070} y={230} label="Partner airport" />
                    <g className="fleet-gold-reward"><text x="130" y="155" textAnchor="middle">+ GOLD</text><text x="1070" y="155" textAnchor="middle">+ GOLD</text></g>
                    <text className="fleet-diagram-label" x="600" y="58" textAnchor="middle">TRADE DELIVERY</text>
                  </>}
                  {unit.kind === 'fighter' && <>
                    <AirportNode x={130} y={230} label="Your airport" />
                    <circle className="fleet-firing-range" cx="740" cy="170" r="140" />
                    <text className="fleet-diagram-label fleet-range-label" x="740" y="58" textAnchor="middle">FIRING RANGE</text>
                    <path className="fleet-enemy-course" d="M 1100 170 H 870" />
                    <text className="fleet-enemy-label" x="970" y="105" textAnchor="middle">Enemy helicopter</text>
                    <g className="fleet-enemy" transform="translate(1080 170)">
                      <path d="M 24 0 H 62" /><polygon points="-17,0 12,12 12,-12" />
                    </g>
                    <circle className="fleet-shell" cx="740" cy="170" r="5" />
                    <circle className="fleet-impact" cx="870" cy="170" r="12" />
                    <text className="fleet-diagram-label" x="650" y="330" textAnchor="middle">STOP AT RANGE · SHOOT, DON’T COLLIDE</text>
                  </>}
                  {unit.kind === 'helicopter' && <>
                    <AirportNode x={130} y={230} label="Launch airport" />
                    <rect className="fleet-landing-tile" x="1025" y="175" width="90" height="90" rx="3" />
                    <path className="fleet-landing-cross" d="M 1055 220 H 1085 M 1070 205 V 235" />
                    <text className="fleet-diagram-label" x="1070" y="295" textAnchor="middle">Landing tile</text>
                    <text className="fleet-diagram-label" x="600" y="58" textAnchor="middle">COMMITTED TROOPS · ONE-WAY INSERTION</text>
                    <g className="fleet-landed-troops" transform="translate(1070 220)">
                      <rect x="-16" y="-12" width="10" height="10" /><rect x="1" y="-4" width="10" height="10" /><rect x="-16" y="10" width="10" height="10" />
                    </g>
                  </>}
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
            <ol className="fleet-milestones" aria-label="Mission sequence">{FLEET_MISSIONS[0].steps.map((step, index) => <li key={index} data-state={index === 0 ? 'current' : 'next'}>{step}</li>)}</ol>
            <p className="fleet-mission-caption">{FLEET_MISSIONS[0].captions[0]}</p>
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
            <p><span className="fleet-scroll-hint">Scroll through the mission</span><span className="fleet-static-hint">Choose a mission</span> <span aria-hidden="true">→</span></p>
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
