'use client';

import { useEffect, useRef } from 'react';
import { FLEET_CHAPTER_STOPS, FLEET_MISSIONS, FLEET_MOTION_QUERY, fleetMission, fleetMotion, fleetScrollProgress } from './airFleetMotion';
import StoryControls, { useStoryPlayer } from './StoryControls';
import { viewportStoryProgress } from './storyPlayback';
import { FleetEffects } from './OperationEffects';
import OperationsViewport from './OperationsViewport';

const aircraft = [
  {
    slug: 'Passenger_Plane', name: 'Passenger plane', role: 'Trade', kind: 'trade',
    description: 'The air twin of a trade ship: triangle marker, airport-to-airport routes, faster travel, and a global cap of 800.',
    stats: [['Naval twin', 'Trade ship'], ['Speed', '1.2×'], ['Global cap', '800']],
    doctrine: ['Required first', 'Two eligible active airports and a trade relationship'],
    consequence: ['Value appears when', 'The plane arrives; an uninterrupted flight pays both owners'],
    route: 'M 130 230 C 350 230 370 100 600 100 S 850 230 1070 230',
    points: '17,0 -12,12 -12,-12',
  },
  {
    slug: 'Fighter_Jet', name: 'Fighter jet', role: 'Combat', kind: 'fighter',
    description: 'A warship-inspired fighter: pentagon marker, shared health and fire values, with air-specific targeting, capture, and airport support.',
    stats: [['Naval twin', 'Warship'], ['Speed', '1.2×'], ['Role', 'Combat']],
    doctrine: ['Required first', 'An active owned airport and a valid hostile aircraft'],
    consequence: ['Control means', 'Engaging within range, firing shells, and returning to patrol or repair'],
    route: 'M 130 230 C 330 230 500 170 740 170',
    points: '17,0 5,15 -14,9 -14,-9 5,-15',
  },
  {
    slug: 'Attack_Helicopter', name: 'Attack helicopter', role: 'Insertion', kind: 'helicopter',
    description: 'The air twin of a transport ship: triangular marker, visible route trail and ETA, paid launch, troop delivery, and two active per player.',
    stats: [['Naval twin', 'Transport ship'], ['Speed', '1.2×'], ['Player limit', '2']],
    doctrine: ['Committed first', 'Launch cost, real troops, an active airport, and a valid tile'],
    consequence: ['Mission ends when', 'Troops transfer to land combat and the carrier is consumed'],
    route: 'M 130 230 C 340 230 425 125 635 130 S 855 110 1070 110',
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
  const player = useStoryPlayer(storyRef, 30000);
  const { sample, refreshRef } = player;
  const currentMotion = fleetMotion(player.progress);
  const currentMission = fleetMission(currentMotion.active, currentMotion.flights[currentMotion.active]);

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
    const missionNote = story.querySelector<HTMLElement>('.fleet-mission-note');
    const doctrineLabel = story.querySelector<HTMLElement>('.fleet-doctrine-label');
    const doctrineValue = story.querySelector<HTMLElement>('.fleet-doctrine-value');
    const consequenceLabel = story.querySelector<HTMLElement>('.fleet-consequence-label');
    const consequenceValue = story.querySelector<HTMLElement>('.fleet-consequence-value');
    const milestones = Array.from(story.querySelectorAll<HTMLElement>('.fleet-milestones li'));
    const enemy = story.querySelector<SVGGElement>('.fleet-enemy');
    const shell = story.querySelector<SVGGElement>('.fleet-shell');
    const shotTrail = story.querySelector<SVGPathElement>('.fleet-shot-trail');
    const muzzleFlash = story.querySelector<SVGGElement>('.fleet-muzzle-flash');
    const impactRing = story.querySelector<SVGCircleElement>('.fleet-impact');
    const targetLock = story.querySelector<SVGGElement>('.fleet-target-lock');
    const targetHealth = story.querySelector<SVGRectElement>('.fleet-target-health-live');
    const threatCleared = story.querySelector<SVGGElement>('.fleet-threat-cleared');
    const weaponCycle = story.querySelector<SVGCircleElement>('.fleet-weapon-cycle');
    const rope = story.querySelector<SVGPathElement>('.fleet-deployment-rope');
    const rappellers = Array.from(story.querySelectorAll<SVGGElement>('.fleet-rappeller'));
    const groundAdvance = story.querySelector<SVGPathElement>('.fleet-ground-advance');
    const etaValue = story.querySelector<SVGTextElement>('.fleet-eta-value');
    const payloadManifest = story.querySelector<SVGGElement>('.fleet-payload-manifest');
    const lengths = paths.map((path) => path.getTotalLength());
    const wakes = Array.from(story.querySelectorAll<SVGPathElement>('.fleet-route-wake'));
    let frame = 0;
    let disposed = false;
    let observedWidth = 0;

    const update = () => {
      frame = 0;
      const enabled = story.classList.contains('fleet-scroll-enabled');
      const inset = parseFloat(window.getComputedStyle(stage).top) || 0;
      const progress = fleetScrollProgress(story.getBoundingClientRect().top, story.offsetHeight, stage.offsetHeight, inset);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scene = story.querySelector('.operations-viewport')?.getBoundingClientRect() ?? stage.getBoundingClientRect();
      const motion = fleetMotion(sample(reduced ? 0 : enabled ? progress : viewportStoryProgress(scene.top, scene.height, window.innerHeight)));
      story.dataset.active = String(motion.active);
      story.style.setProperty('--fleet-progress', String(motion.progress));
      track.style.transform = enabled ? `translate3d(${-motion.chapter * viewport.clientWidth}px, 0, 0)` : '';
      chapters.forEach((chapter, index) => { chapter.inert = enabled && index !== motion.active; });
      controls.forEach((control, index) => {
        if (index === motion.active) control.setAttribute('aria-current', 'step');
        else control.removeAttribute('aria-current');
      });
      const activeMission = FLEET_MISSIONS[motion.active];
      const activeState = fleetMission(motion.active, motion.flights[motion.active]);
      if (missionTitle) missionTitle.textContent = activeMission.title;
      if (missionNote) missionNote.textContent = activeMission.note;
      if (missionCaption) missionCaption.textContent = activeMission.captions[activeState.phase];
      if (doctrineLabel) doctrineLabel.textContent = aircraft[motion.active].doctrine[0];
      if (doctrineValue) doctrineValue.textContent = aircraft[motion.active].doctrine[1];
      if (consequenceLabel) consequenceLabel.textContent = aircraft[motion.active].consequence[0];
      if (consequenceValue) consequenceValue.textContent = aircraft[motion.active].consequence[1];
      milestones.forEach((step, index) => {
        step.textContent = activeMission.steps[index];
        step.dataset.state = index < activeState.phase ? 'complete' : index === activeState.phase ? 'current' : 'next';
        if (index === activeState.phase) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
      paths.forEach((path, index) => {
        const state = fleetMission(index, motion.flights[index]);
        const flight = state.flight;
        const length = lengths[index];
        const distance = length * flight;
        const point = path.getPointAtLength(distance);
        const before = path.getPointAtLength(Math.max(0, distance - 2));
        const after = path.getPointAtLength(Math.min(length, distance + 2));
        const heading = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
        const start = Math.max(0, distance - 100);
        wakes[index]?.setAttribute('d', Array.from({ length: 20 }, (_, i) => {
          const point = path.getPointAtLength(start + (distance - start) * i / 19);
          return `${i ? 'L' : 'M'} ${point.x} ${point.y}`;
        }).join(' '));
        wakes[index]?.style.setProperty('opacity', String(state.aircraftOpacity * 0.25));
        path.style.strokeDashoffset = String(100 - flight * 100);
        units[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${heading})`);
        units[index]?.style.setProperty('opacity', String(state.aircraftOpacity));
        lanes[index]?.classList.toggle('is-engaging', state.inCombat);
        lanes[index]?.style.setProperty('--arrival', String(state.arrival));
        lanes[index]?.style.setProperty('--gold-opacity', String(state.goldOpacity));
        lanes[index]?.style.setProperty('--readiness', String(state.readiness));
        lanes[index]?.style.setProperty('--flight', String(state.flight));
        lanes[index]?.style.setProperty('--target-opacity', String(state.targetOpacity));
        lanes[index]?.style.setProperty('--target-health', String(state.targetHealth));
        lanes[index]?.style.setProperty('--range-opacity', state.flight === 1 ? '1' : '0');
        if (index === 1) {
          enemy?.setAttribute('transform', `translate(${1080 - state.enemyFlight * 210} 170)`);
          enemy?.style.setProperty('opacity', String(state.targetOpacity));
          // Start outside the jet's nose; the projectile tip meets the target.
          const shotX = 762 + 93 * state.projectile;
          shell?.setAttribute('transform', `translate(${shotX} 170)`);
          shell?.style.setProperty('opacity', String(state.projectileOpacity));
          shotTrail?.setAttribute('d', `M ${Math.max(762, shotX - 65)} 170 H ${shotX - 7}`);
          shotTrail?.style.setProperty('opacity', String(state.projectileOpacity * 0.8));
          muzzleFlash?.style.setProperty('opacity', String(state.muzzleOpacity));
          impactRing?.setAttribute('r', String(12 + state.impact * 48));
          impactRing?.style.setProperty('opacity', String(state.impactOpacity));
          targetLock?.style.setProperty('opacity', String(state.lockOpacity));
          targetHealth?.setAttribute('width', String(82 * state.targetHealth));
          threatCleared?.style.setProperty('opacity', String(state.threatCleared));
          weaponCycle?.setAttribute('stroke-dashoffset', String(100 - state.weaponCycle * 100));
        }
        if (index === 2) {
          rope?.setAttribute('d', `M 1070 125 V ${125 + 130 * state.ropeLength}`);
          rope?.style.setProperty('opacity', String(state.ropeOpacity));
          rappellers.forEach((trooper, i) => {
            const { descent, opacity } = state.rappellers[i];
            const spread = Math.min(1, Math.max(0, (descent - 0.95) / 0.05));
            trooper.setAttribute('transform', `translate(${1070 + (i - 1) * 18 * spread + state.troopsOpacity * 30} ${140 + descent * 105})`);
            trooper.style.setProperty('opacity', String(opacity));
          });
          groundAdvance?.style.setProperty('opacity', String(state.troopsOpacity));
          payloadManifest?.style.setProperty('opacity', String(state.payloadOpacity));
          if (etaValue) etaValue.textContent = state.flight >= 1 ? (state.ropeLength > 0 ? 'DEPLOYING' : 'ON TARGET') : `${Math.max(0, Math.ceil((1 - state.flight) * 24))}s`;
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
  }, [sample, refreshRef]);

  const goToChapter = (index: number) => {
    player.seek(FLEET_CHAPTER_STOPS[index] - 0.12);
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
            <div className="fleet-mission-label"><strong className="fleet-mission-title">{FLEET_MISSIONS[0].title}</strong><span className="fleet-mission-note">{FLEET_MISSIONS[0].note}</span></div>
            <OperationsViewport playback={player} kind={(['trade', 'intercept', 'landing'] as const)[currentMotion.active]} progress={currentMotion.flights[currentMotion.active]} air fleet fallback={<div className="fleet-scene" aria-hidden="true">
              <div className="fleet-map-texture" />
              <svg className="fleet-routes" viewBox="0 0 1200 350" fill="none">
              {aircraft.map((unit, index) => (
                <g key={unit.slug} className={`fleet-lane fleet-lane-${unit.kind}`}>
                  <path className="fleet-route-wake" />
                  {unit.kind === 'trade' && <>
                    <AirportNode x={130} y={230} label="Origin airport" />
                    <AirportNode x={1070} y={230} label="Partner airport" />
                    <g className="fleet-airport-ready fleet-airport-ready-origin" transform="translate(130 185)"><circle r="10" /><path d="M -4 0 L -1 4 L 6 -5" /></g>
                    <g className="fleet-airport-ready fleet-airport-ready-partner" transform="translate(1070 185)"><circle r="10" /><path d="M -4 0 L -1 4 L 6 -5" /></g>
                    <g className="fleet-route-checkpoints">
                      <g transform="translate(390 143)"><circle r="10" /><text y="-18" textAnchor="middle">ROUTE VALID</text></g>
                      <g transform="translate(812 143)"><circle r="10" /><text y="-18" textAnchor="middle">IN TRANSIT</text></g>
                    </g>
                    <g className="fleet-gold-reward"><text x="130" y="155" textAnchor="middle">+ GOLD</text><text x="1070" y="155" textAnchor="middle">+ GOLD</text></g>
                    <path className="fleet-payment-link" d="M 1018 176 H 1122" />
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
                    <g className="fleet-target-lock" transform="translate(870 170)"><path d="M -38 -22 V -38 H -22 M 22 -38 H 38 V -22 M 38 22 V 38 H 22 M -22 38 H -38 V 22" /><circle r="29" /></g>
                    <g className="fleet-target-health" transform="translate(829 216)"><rect width="82" height="7" rx="3.5" /><rect className="fleet-target-health-live" width="82" height="7" rx="3.5" /></g>
                    <path className="fleet-shot-trail" d="M 762 170 H 762" />
                    <g className="fleet-muzzle-flash" transform="translate(762 170)"><path d="M -7 0 H 15 M 0 -10 V 10 M -5 -7 8 7 M -5 7 8 -7" /></g>
                    <g className="fleet-shell" transform="translate(762 170)">
                      <path className="fleet-projectile-plume" d="M -8 -3 -30 0 -8 3" />
                      <path className="fleet-projectile-fin" d="M -5 -3 -12 -8 -9 0 -12 8 -5 3" />
                      <path className="fleet-projectile-body" d="M -8 -3 H 7 L 15 0 7 3 H -8 Z" />
                    </g>
                    <circle className="fleet-impact" cx="870" cy="170" r="12" />
                    <g className="fleet-threat-cleared" transform="translate(870 170)"><circle r="38" /><path d="M -14 0 L -4 11 L 17 -15" /><text y="64" textAnchor="middle">THREAT CLEARED</text></g>
                    <text className="fleet-diagram-label" x="650" y="330" textAnchor="middle">STOP AT RANGE · SHOOT, DON’T COLLIDE</text>
                  </>}
                  {unit.kind === 'helicopter' && <>
                    <AirportNode x={130} y={230} label="Launch airport" />
                    <rect className="fleet-landing-tile" x="1025" y="210" width="90" height="90" rx="3" />
                    <path className="fleet-landing-cross" d="M 1055 255 H 1085 M 1070 240 V 270" />
                    <text className="fleet-diagram-label" x="1070" y="330" textAnchor="middle">Landing tile</text>
                    <text className="fleet-diagram-label" x="600" y="58" textAnchor="middle">COMMITTED TROOPS · ONE-WAY INSERTION</text>
                    <g className="fleet-payload-manifest" transform="translate(185 150)"><text x="0" y="-17">TROOPS COMMITTED</text>{[0, 1, 2].map((trooper) => <circle key={trooper} cx={trooper * 18} r="6" />)}</g>
                    <g className="fleet-eta" transform="translate(730 76)"><rect x="-72" y="-18" width="144" height="36" rx="18" /><text x="-47" y="6">ETA</text><text className="fleet-eta-value" x="52" y="6" textAnchor="end">24s</text></g>
                    <path className="fleet-deployment-rope" d="M 1070 125 V 125" />
                    {[0, 1, 2].map((trooper) => <g key={trooper} className="fleet-rappeller" transform="translate(1070 140)">
                      <circle cx="0" cy="-9" r="4" />
                      <path d="M 0 -3 V 6 M -6 -6 -4 0 0 2 5 -2 5 -6 M 0 6 -5 14 M 0 6 5 14" />
                    </g>)}
                    <path className="fleet-ground-advance" d="M 1124 255 H 1162 M 1153 247 1162 255 1153 263" />
                  </>}
                  <path className="fleet-route-guide" d={unit.route} />
                  <path className="fleet-route-progress" d={unit.route} pathLength="100" />
                  <g className="fleet-aircraft">
                    <ellipse className="operation-unit-shadow" cx="-9" cy="15" rx="22" ry="8" />
                    <circle className="fleet-signal" r="29" />
                    <circle className="fleet-signal-inner" r="21" />
                    <path className="fleet-unit-tail" d="M -54 0 H -20" />
                    <polygon className="fleet-unit-body" points={unit.points} />
                    {unit.kind === 'fighter' && <><polygon className="fleet-unit-core" points="10,0 3,9 -8,5 -8,-5 3,-9" /><circle className="fleet-weapon-cycle" r="35" pathLength="100" strokeDasharray="100" strokeDashoffset="100" /></>}
                    {unit.kind === 'trade' && <g className="fleet-cargo-packets"><rect x="-6" y="-5" width="5" height="10" /><rect x="2" y="-5" width="5" height="10" /></g>}
                    {unit.kind === 'helicopter' && <g className="fleet-payload-dots"><circle cx="-5" r="2.5" /><circle cx="2" r="2.5" /><circle cx="9" r="2.5" /></g>}
                  </g>
                  <FleetEffects index={index} progress={currentMotion.flights[index]} />
                </g>
              ))}
              </svg>
            </div>} />
            <ol className="fleet-milestones" aria-label="Mission sequence">{FLEET_MISSIONS[0].steps.map((step, index) => <li key={index} data-state={index === 0 ? 'current' : 'next'}>{step}</li>)}</ol>
            <p className="fleet-mission-caption">{FLEET_MISSIONS[0].captions[0]}</p>
            <aside className="fleet-doctrine">
              <p><span className="fleet-doctrine-label">{aircraft[0].doctrine[0]}</span><strong className="fleet-doctrine-value">{aircraft[0].doctrine[1]}</strong></p>
              <p><span className="fleet-consequence-label">{aircraft[0].consequence[0]}</span><strong className="fleet-consequence-value">{aircraft[0].consequence[1]}</strong></p>
            </aside>
          </div>

          <StoryControls player={player} label="Air missions" phase={`${aircraft[currentMotion.active].role} · ${FLEET_MISSIONS[currentMotion.active].steps[currentMission.phase]}`} />
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
