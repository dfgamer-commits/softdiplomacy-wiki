'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  CATEGORY_MOTION_QUERY, CATEGORY_STEP_STOPS, CATEGORY_TOPICS,
  categoryScrollProgress, categorySegment, categoryState,
} from './categoryMotion';
import type { CategoryTopic, WikiCitation } from './categoryMotion';
import StoryControls, { useStoryPlayer } from './StoryControls';
import { viewportStoryProgress } from './storyPlayback';
import { CategoryEffects } from './OperationEffects';
import { pathTailDistances } from './cinematicMotion';
import OperationsViewport from './OperationsViewport';

function SourceLink({ source }: { source: WikiCitation }) {
  const [slug, section] = source;
  return <a href={`https://openfront.wiki/${encodeURIComponent(slug)}${section ? `#${encodeURIComponent(section)}` : ''}`} target="_blank" rel="noreferrer">OpenFront wiki · {slug.replaceAll('_', ' ')}{section ? ` / ${section.replaceAll('_', ' ')}` : ''} ↗</a>;
}

type Point = { x: number; y: number };

function Route({ d, progress, air = false, rail = false, trail = true }: { d: string; progress: number; air?: boolean; rail?: boolean; trail?: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const unitRef = useRef<SVGGElement>(null);
  const wakeRef = useRef<SVGPathElement>(null);
  const tailRefs = useRef<Array<SVGCircleElement | null>>([]);
  const trainCarRefs = useRef<Array<SVGGElement | null>>([]);
  const trainCouplerRefs = useRef<Array<SVGLineElement | null>>([]);
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    // A short sampled wake stays on the actual curve, including tight bends.
    const end = length * progress;
    const start = Math.max(0, end - 65);
    const wake = Array.from({ length: 18 }, (_, index) => {
      const point = path.getPointAtLength(start + (end - start) * index / 17);
      return `${index ? 'L' : 'M'} ${point.x} ${point.y}`;
    }).join(' ');
    wakeRef.current?.setAttribute('d', wake);
    pathTailDistances(length, progress, 12, 85).forEach((distance, index) => {
      const point = path.getPointAtLength(distance);
      tailRefs.current[index]?.setAttribute('cx', String(point.x));
      tailRefs.current[index]?.setAttribute('cy', String(point.y));
    });
    const poseAt = (distance: number) => {
      const bounded = Math.min(length, Math.max(0, distance));
      const point = path.getPointAtLength(bounded);
      const from = path.getPointAtLength(Math.max(0, bounded - 2));
      const to = path.getPointAtLength(Math.min(length, bounded + 2));
      return { point, angle: Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI };
    };
    if (rail) {
      // The nose travels station-to-station while every carriage samples its own
      // point and tangent. This is what lets the consist articulate through bends.
      const nose = 70 + progress * Math.max(0, length - 140);
      const poses = [0, 34, 68].map((offset) => poseAt(nose - offset));
      poses.forEach(({ point, angle }, index) => {
        trainCarRefs.current[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
      });
      trainCouplerRefs.current.forEach((coupler, index) => {
        const front = poses[index]?.point;
        const rear = poses[index + 1]?.point;
        if (!coupler || !front || !rear) return;
        coupler.setAttribute('x1', String(front.x));
        coupler.setAttribute('y1', String(front.y));
        coupler.setAttribute('x2', String(rear.x));
        coupler.setAttribute('y2', String(rear.y));
      });
      return;
    }
    const unit = unitRef.current;
    if (!unit) return;
    const { point, angle } = poseAt(length * progress);
    unit.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
  }, [d, progress, rail]);
  return <>
    <path className="category-route-base" d={d} />
    {trail && <path ref={wakeRef} className="category-route-wake" />}
    {trail && <g className="operation-route-particles" opacity={progress > 0 && progress < 1 ? 1 : 0}>{Array.from({ length: 12 }, (_, index) => <circle key={index} ref={(node) => { tailRefs.current[index] = node; }} r={2.5 - index * 0.12} opacity={0.75 - index * 0.055} />)}</g>}
    <path ref={pathRef} className="category-route-live" d={d} pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress * 100} opacity={trail ? 1 : 0} />
    {rail ? <g className="category-train">
      {[0, 1].map((index) => <line key={`coupler-${index}`} ref={(node) => { trainCouplerRefs.current[index] = node; }} className="category-train-coupler" />)}
      {[0, 1, 2].map((index) => <g key={`car-${index}`} ref={(node) => { trainCarRefs.current[index] = node; }} className={`category-train-car${index === 0 ? ' category-train-engine' : ''}`}>
        {index === 0 && <path className="operation-headlamp" d="M 18 -4 L 90 -26 Q 105 0 90 26 L 18 4 Z" />}
        <rect className="category-train-body" x="-14" y="-10" width="28" height="20" rx="4" />
        <path className="category-train-roof" d="M -10 -10 H 10" />
        <rect className="category-train-window" x="-8" y="-6" width="7" height="6" rx="1" />
        <rect className="category-train-window" x="3" y="-6" width="7" height="6" rx="1" />
        <circle className="category-train-wheel" cx="-8" cy="11" r="3" />
        <circle className="category-train-wheel" cx="8" cy="11" r="3" />
        {index === 0 && <path className="category-train-nose" d="M 14 -7 L 20 0 L 14 7 Z" />}
      </g>)}
    </g> : <g ref={unitRef} transform="translate(110 180)"><Unit air={air} /></g>}
  </>;
}

function Unit({ air = false, fighter = false }: { air?: boolean; fighter?: boolean }) {
  return <g className="category-unit">
    <ellipse className="operation-unit-shadow" cx="-7" cy="13" rx="18" ry="6" />
    <circle className="category-unit-halo" r={fighter ? 26 : 20} />
    <path className="category-unit-heading" d="M 23 -6 L 29 0 L 23 6" />
    {air ? <polygon points={fighter ? '18,0 6,17 -15,10 -15,-10 6,-17' : '17,0 -12,11 -12,-11'} /> : <><circle r={fighter ? 17 : 10} /><circle className="category-unit-inner" r={fighter ? 10 : 4} /></>}
    {fighter && air && <polygon className="category-unit-inner" points="10,0 3,9 -8,5 -8,-5 3,-9" />}
  </g>;
}

function Station({ x, y, label, airport = false, progress = 1 }: { x: number; y: number; label: string; airport?: boolean; progress?: number }) {
  return <g transform={`translate(${x} ${y})`} className="category-station">
    <circle r="35" strokeDasharray="3 6" />
    <g opacity={0.25 + progress * 0.75} transform={`scale(${0.75 + progress * 0.25})`}>
      {airport ? <polygon points="0,-24 24,0 0,24 -24,0" /> : <rect x="-21" y="-21" width="42" height="42" rx="5" />}
      <path d={airport ? 'M -11 0 H 11 M 0 -11 V 11' : 'M -9 11 V -7 M 0 11 V -12 M 9 11 V -4'} />
    </g>
    <text y="64" textAnchor="middle">{label}</text>
  </g>;
}

function Trooper({ x, y, opacity = 1 }: { x: number; y: number; opacity?: number }) {
  return <g transform={`translate(${x} ${y})`} opacity={opacity} className="category-trooper">
    <circle cy="-10" r="4" /><path d="M 0 -6 V 7 M -7 -1 L 0 -4 L 7 -1 M 0 7 L -6 16 M 0 7 L 6 16" />
  </g>;
}

function CategoryDiagram({ topic, progress }: { topic: CategoryTopic; progress: number }) {
  const state = categoryState(progress);
  const id = useId().replace(/:/g, '');
  const air = Boolean(topic.air);
  const route = 'M 110 180 C 250 180 230 85 385 85 S 560 180 690 180';
  const landingRoute = air ? 'M 110 180 C 290 180 380 85 580 85' : 'M 110 180 C 260 180 305 110 440 110 S 510 205 580 205';
  const railRoute = 'M 40 180 H 245 C 310 180 285 88 355 88 H 445 C 515 88 490 180 555 180 H 760';
  const fighterX = 110 + 340 * state.action;
  const endpoint = air ? 'Airport' : 'Port';
  const isWater = !air && ['trade', 'landing', 'intercept'].includes(topic.scene);
  return <svg className={`category-diagram${isWater ? ' category-water' : ''}`} viewBox="0 0 800 310" aria-hidden="true">
    <defs>
      <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 H 0 V 40" fill="none" stroke="currentColor" strokeOpacity=".1" /></pattern>
    </defs>
    <rect width="800" height="310" fill={`url(#${id}-grid)`} />
    <g className="category-coordinate-labels"><text x="22" y="27">{air ? 'AIR OPERATIONS' : isWater ? 'NAVAL OPERATIONS' : 'GROUND SYSTEMS'}</text><text x="778" y="27" textAnchor="end">ILLUSTRATIVE / NOT TO SCALE</text></g>

    {topic.scene === 'trade' && <>
      <Station x={110} y={180} label={`Your ${endpoint.toLowerCase()}`} airport={air} />
      <Station x={690} y={180} label={`Partner ${endpoint.toLowerCase()}`} airport={air} />
      <g className="category-validation" opacity={state.prepare} transform="translate(400 48)"><rect x="-82" y="-16" width="164" height="32" rx="16" /><text y="5" textAnchor="middle">TRADE RELATION ✓</text></g>
      <g className="category-route-risk" opacity={state.interaction * (1 - state.outcome)}><circle cx="420" cy="80" r={18 + state.interaction * 12} /><text x="420" y="85" textAnchor="middle">!</text></g>
      <g opacity={1 - state.outcome} className="category-cyan"><Route d={route} progress={state.action} air={air} /></g>
      {[110, 690].map((x) => <g key={x} className="category-gold" opacity={state.outcome} transform={`translate(${x} ${115 - state.outcome * 14})`}><circle r="28" /><text textAnchor="middle" y="6">+G</text></g>)}
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">{state.arrival ? 'ARRIVED → TRADE PAYMENT' : 'NO ARRIVAL, NO TRADE PAYMENT'}</text>
    </>}

    {topic.scene === 'intercept' && <>
      <Station x={110} y={180} label={endpoint} airport={air} />
      <path className="category-route-base" d="M 110 180 H 450" />
      <circle className="category-range" cx="450" cy="180" r="180" opacity={state.action} />
      <g transform={`translate(${fighterX} 180)`} className={state.engaging ? 'category-hostile' : 'category-cyan'}><Unit air={air} fighter /></g>
      <g transform="translate(620 180) rotate(180)" className="category-hostile" opacity={state.targetVisible ? 0.18 + state.interaction * 0.82 : 0}><Unit air={air} /></g>
      <g className="category-target-lock" opacity={state.interaction * (state.targetVisible ? 1 : 0)} transform="translate(620 180)"><path d="M -35 -21 V -35 H -21 M 21 -35 H 35 V -21 M 35 21 V 35 H 21 M -21 35 H -35 V 21" /></g>
      <g className="category-projectile" opacity={state.shotVisible ? 1 : 0} transform={`translate(${474 + 130 * state.shot} 180)`}>
        <path d="M -47 0 H -8" /><polygon points="16,0 6,-4 -7,-4 -7,4 6,4" />
      </g>
      <circle className="category-impact" cx="620" cy="180" r={10 + state.impact * 45} opacity={progress >= 0.73 ? 1 - state.impact : 0} />
      <g className="category-reload" transform={`translate(${fighterX} 180)`} opacity={state.engaging ? 1 : 0}><circle r="32" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - state.interaction * 100} /></g>
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">{state.phase === 3 ? 'THREAT CLEARED · RETURN TO PATROL' : 'DETECT → ENGAGE → FIRE A SHELL'}</text>
    </>}

    {topic.scene === 'landing' && <>
      <path className="category-land" d="M 555 310 V 235 L 600 190 L 620 65 H 800 V 310 Z" />
      <Station x={110} y={180} label={air ? 'Airport' : 'Owned coast'} airport={air} />
      <path className="category-route-base" d={landingRoute} />
      <g className="category-payload" opacity={state.prepare * (1 - state.outcome)}>{[0, 1, 2].map((i) => <circle key={i} cx={74 + i * 15} cy="115" r="5" />)}<text x="96" y="95" textAnchor="middle">PAYLOAD</text></g>
      <g className="category-amber" opacity={1 - categorySegment(progress, 0.88, 0.98)}><Route d={landingRoute} progress={state.action} air={air} /></g>
      <g className="category-amber">
        {air && <path className="category-rope" d={`M 580 101 V ${101 + 119 * state.rope}`} opacity={1 - state.groundAdvance} />}
        {state.descent.map((descent, index) => <Trooper key={index} x={580 + index * 18 * descent + state.groundAdvance * 48} y={air ? 117 + descent * 103 : 220} opacity={air ? (descent > 0 ? 1 : 0) : descent} />)}
        <path className="category-ground-arrow" d={`M 622 242 H ${622 + state.groundAdvance * 75}`} opacity={state.groundAdvance} />
      </g>
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">{state.groundAdvance > 0 ? 'ARRIVAL → RELEASE TROOPS' : 'TRANSPORT TROOPS TO THE DESTINATION'}</text>
    </>}

    {topic.scene === 'rail' && <>
      <path className="category-rail-bed" d={railRoute} pathLength="100" strokeDasharray="100" strokeDashoffset={100 - state.prepare * 100} />
      <path className="category-rail-ties" d={railRoute} opacity={state.prepare} />
      <path className="category-rail-center" d={railRoute} opacity={state.prepare} />
      <g className="category-platforms" opacity={state.prepare}><rect x="64" y="204" width="92" height="9" rx="2" /><rect x="644" y="204" width="92" height="9" rx="2" /></g>
      <g className="category-rail-signal" opacity={state.prepare} transform="translate(316 116)"><path d="M 0 38 V 2 H 20" /><circle cx="20" cy="2" r="8" /><circle className={state.action > 0 ? 'is-clear' : ''} cx="20" cy="2" r="3" /></g>
      <Station x={110} y={180} label="Factory" />
      <Station x={690} y={180} label={air ? 'Airport station' : 'Port station'} airport={air} />
      <g className="category-cyan" opacity={state.prepare}><Route d={railRoute} progress={state.action} rail trail={false} /></g>
      <g className="category-arrival-check" opacity={state.interaction}><circle cx="690" cy="180" r={39 + state.interaction * 13} /><text x="690" y="125" textAnchor="middle">STATION VALID ✓</text></g>
      <g className="category-gold" opacity={state.outcome}><text x="690" y="110" textAnchor="middle">{air ? '80% OF PORT PAYOUT' : 'STATION REACHED'}</text></g>
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">{state.prepare < 1 ? 'CONNECT ELIGIBLE STATIONS' : 'TRAIN POSITION FOLLOWS THE TRACK'}</text>
    </>}

    {topic.scene === 'territory' && <>
      {Array.from({ length: 7 }, (_, column) => Array.from({ length: 3 }, (_, row) => {
        const captured = column < 3 || (column < 3 + Math.floor(state.outcome * 3) && row !== 2);
        return <rect key={`${column}-${row}`} className={captured ? 'category-owned-tile' : 'category-enemy-tile'} x={180 + column * 63} y={80 + row * 58} width="59" height="54" rx="3" />;
      }))}
      <g className="category-cyan">{[0, 1, 2].map((i) => <Trooper key={i} x={250 + state.interaction * 240} y={102 + i * 28} opacity={state.action} />)}</g>
      <g className="category-hostile" opacity={state.interaction * (1 - state.outcome)}><path className="category-defense" d="M 540 104 V 164 Q 540 202 575 219 Q 610 202 610 164 V 104 Q 575 86 540 104 Z" /><text x="575" y="150" textAnchor="middle">DEF</text><text x="575" y="178" textAnchor="middle">TERRAIN</text></g>
      <g className="category-meter"><text x="65" y="87">RESERVE</text><rect x="65" y="105" width="16" height="115" /><rect x="65" y={105 + state.action * 42} width="16" height={115 - state.action * 42} className="category-meter-fill" /></g>
      <path className="category-ground-arrow" d={`M 350 252 H ${350 + state.interaction * 190}`} />
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">COMMITTED TROOPS LEAVE YOUR RESERVE · DEFENSE STILL MATTERS</text>
    </>}

    {topic.scene === 'construction' && <>
      <g transform="translate(390 161)">
        <rect className="category-owned-tile" x="-115" y="-85" width="230" height="160" rx="5" />
        <rect className="category-build-outline" x="-70" y="-57" width="140" height="111" strokeDasharray="7 8" opacity={1 - state.interaction} />
        <g className="category-building" transform={`translate(0 ${54 * (1 - state.interaction)}) scale(1 ${Math.max(0.01, state.interaction)})`} opacity={state.interaction}>
          <rect x="-57" y="-18" width="37" height="72" /><rect x="-16" y="-55" width="38" height="109" /><rect x="27" y="-1" width="35" height="55" />
          {[-37, 3, 44].map((x) => <path key={x} d={`M ${x} 7 V 15 M ${x} 27 V 35`} />)}
        </g>
        <circle className="category-range" r={94 + 29 * state.outcome} opacity={state.outcome} />
      </g>
      <g className="category-validation" opacity={state.prepare} transform="translate(390 48)"><rect x="-78" y="-16" width="156" height="32" rx="16" /><text y="5" textAnchor="middle">CITY EXAMPLE</text></g>
      <g className="category-gold category-cost" opacity={state.action * (1 - state.interaction)} transform="translate(230 155)"><circle r="23" /><text y="5" textAnchor="middle">−G</text></g>
      <g className="category-meter" opacity={state.outcome}><text x="580" y="130">CAPACITY</text><rect x="580" y="151" width="130" height="16" /><rect className="category-meter-fill" x="580" y="151" width={50 + 80 * state.outcome} height="16" /></g>
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">CONSTRUCTION → MAXIMUM POPULATION CAPACITY</text>
    </>}

    {topic.scene === 'economy' && <>
      <path className="category-route-base" d="M 100 145 H 670 M 230 230 Q 260 145 380 145" />
      <Station x={100} y={145} label="Base income" />
      <g className="category-gold" transform="translate(385 145)"><circle r="51" /><circle r={27 + state.prepare * 6 + state.action * 9 - state.outcome * 15} /><text y="7" textAnchor="middle">G</text><text y="79" textAnchor="middle">Gold reserve</text></g>
      <g className="category-gold" opacity={state.prepare < 1 ? 1 : 0} transform={`translate(${140 + state.prepare * 195} 145)`}><circle r="10" /></g>
      <g className="category-cyan" opacity={1 - state.action} transform={`translate(${220 + state.action * 115} ${230 - state.action * 85})`}><Unit /></g>
      <g className="category-purchase-quote" opacity={state.interaction}><path d="M 455 98 H 595 V 132 H 455 Z" /><text x="525" y="120" textAnchor="middle">PURCHASE VALID ✓</text></g>
      <g className="category-gold" opacity={state.outcome} transform={`translate(${430 + state.outcome * 240} 145)`}><circle r="10" /></g>
      <Station x={690} y={145} label="Construction" progress={state.outcome} />
      <text className="category-diagram-note" x="400" y="285" textAnchor="middle">BASE INCOME + COMPLETED TRADES − PURCHASES</text>
    </>}

    {topic.scene === 'network' && <>
      <g opacity={state.prepare} className="category-water-twins">{[0, 1, 2].map((index) => <g key={index} transform={`translate(55 ${78 + index * 77})`}><Unit fighter={index === 1} /><text x="30" y="5">{['TRADE SHIP', 'WARSHIP', 'TRANSPORT'][index]}</text></g>)}</g>
      <Station x={235} y={155} label="Air support" airport progress={state.action} />
      {[0, 1, 2].map((index) => {
        const value = categorySegment(progress, 0.57 + index * 0.04, 0.67 + index * 0.04);
        const y = 78 + index * 77;
        const start: Point = { x: 275, y: 155 };
        const end: Point = { x: 610, y };
        const x = start.x + (end.x - start.x) * value;
        const unitY = start.y + (end.y - start.y) * value;
        return <g key={index} className={index === 2 ? 'category-amber' : 'category-cyan'}>
          <path className="category-route-base" d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} />
          <g transform={`translate(${x} ${unitY}) rotate(${Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI})`} opacity={value > 0 ? 1 : 0}><Unit air fighter={index === 1} /></g>
          <text x="655" y={y + 5}>{['TRADE', 'PATROL', 'INSERTION'][index]}</text>
        </g>;
      })}
      <g className="category-validation" opacity={state.outcome} transform="translate(400 278)"><rect x="-142" y="-17" width="284" height="34" rx="17" /><text y="5" textAnchor="middle">THREE CUSTOM AIR ROLES</text></g>
    </>}
    <CategoryEffects scene={topic.scene} progress={progress} air={air} />
  </svg>;
}

export default function CategoryStory({ slug, linkToArticle = false }: { slug: string; linkToArticle?: boolean }) {
  const topic = CATEGORY_TOPICS.find((item) => item.slug === slug);
  return topic ? <TopicSequence key={slug} topic={topic} linkToArticle={linkToArticle} /> : null;
}

function TopicSequence({ topic, linkToArticle }: { topic: CategoryTopic; linkToArticle: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const player = useStoryPlayer(rootRef);
  const { sample, refreshRef } = player;
  const progress = player.progress;
  const [inspecting, setInspecting] = useState(false);
  const id = useId();
  const state = categoryState(progress);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const media = window.matchMedia(CATEGORY_MOTION_QUERY);
    let frame = 0;
    let disposed = false;
    const update = () => {
      frame = 0;
      const pinned = root.classList.contains('category-scroll-enabled');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scene = stage.getBoundingClientRect();
      sample(reduced ? 0 : pinned ? categoryScrollProgress(root.getBoundingClientRect().top, root.offsetHeight, stage.offsetHeight, 88) : viewportStoryProgress(scene.top, scene.height, window.innerHeight));
    };
    const requestUpdate = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    refreshRef.current = requestUpdate;
    const configure = () => {
      if (disposed) return;
      root.classList.toggle('category-scroll-enabled', media.matches);
      // Zoomed text and small viewports must always leave all controls reachable.
      if (stage.offsetHeight > window.innerHeight - 110) root.classList.remove('category-scroll-enabled');
      requestUpdate();
    };
    const observer = new ResizeObserver(configure);
    observer.observe(stage);
    configure();
    void document.fonts.ready.then(configure);
    media.addEventListener('change', configure);
    window.addEventListener('resize', configure);
    window.addEventListener('scroll', requestUpdate, { passive: true });
    return () => {
      disposed = true;
      observer.disconnect();
      media.removeEventListener('change', configure);
      window.removeEventListener('resize', configure);
      window.removeEventListener('scroll', requestUpdate);
      window.cancelAnimationFrame(frame);
      refreshRef.current = () => {};
    };
  }, [sample, refreshRef]);

  const goToStep = (step: number) => {
    player.seek(CATEGORY_STEP_STOPS[step]);
  };

  return <>
    <section className="category-story" data-inspecting={inspecting} ref={rootRef} aria-labelledby={id}>
      <div className="category-stage" ref={stageRef}>
        <div className="category-story-heading"><p className="eyebrow">{topic.label} / in motion</p><button type="button" className="category-skip" onClick={() => {
          endRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
          endRef.current?.focus({ preventScroll: true });
        }}>Skip animation ↓</button></div>
        <h2 id={id}>{topic.title}</h2>
        <div className="category-diagram-frame" onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty('--inspect-x', `${100 * (event.clientX - rect.left) / rect.width}%`);
          event.currentTarget.style.setProperty('--inspect-y', `${100 * (event.clientY - rect.top) / rect.height}%`);
        }}><OperationsViewport key={topic.slug} kind={topic.scene} progress={progress} air={Boolean(topic.air)} fallback={<CategoryDiagram topic={topic} progress={progress} />} /></div>
        <StoryControls player={player} label={topic.label} phase={topic.steps[state.phase]} />
        <ol className="category-steps" aria-label={`${topic.label} sequence`} onPointerEnter={() => setInspecting(true)} onPointerLeave={() => setInspecting(false)} onFocus={() => setInspecting(true)} onBlur={() => setInspecting(false)}>
          {topic.steps.map((step, index) => <li key={step} data-state={index === state.phase ? 'current' : index < state.phase ? 'complete' : 'next'}><button type="button" onClick={() => goToStep(index)} aria-current={index === state.phase ? 'step' : undefined}><span>0{index + 1}</span>{step}</button></li>)}
        </ol>
        <p className="category-caption">{topic.wikiSources ? <q>{topic.captions[state.phase]}</q> : topic.captions[state.phase]}</p>
        {topic.wikiSources && <p className="category-source"><SourceLink source={topic.wikiSources[state.phase]} /></p>}
        <div className="category-intelligence">
          <div><span>{topic.readouts[state.phase][0]}</span><strong>{topic.readouts[state.phase][1]}</strong></div>
          <p><span>{topic.principleSource ? 'From the source' : 'Why it matters'}</span>{topic.principle}{topic.principleSource && <span className="category-source"><SourceLink source={topic.principleSource} /></span>}</p>
        </div>
        <div className="category-timeline" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
        <div className="category-story-footer"><span className="category-scroll-hint">Scroll to follow the sequence</span><span className="category-static-hint">Use the steps to explore</span>{linkToArticle ? <a href={`#/article/${topic.slug}`}>Read {topic.label.toLowerCase()} →</a> : <span>{topic.air ? 'Custom air illustration' : 'Wiki-based illustration'} · not a gameplay simulation</span>}</div>
      </div>
    </section>
    <div className="category-story-end" ref={endRef} tabIndex={-1} aria-label="End of animated sequence" />
  </>;
}

export function CategoryAtlas() {
  const [slug, setSlug] = useState('Combat');
  return <section className="category-atlas" aria-labelledby="category-atlas-title">
    <p className="eyebrow">The interactive field manual</p>
    <h2 id="category-atlas-title">Every system has a story.</h2>
    <p className="category-atlas-intro">Choose a topic, then scroll through what happens—and why. Each main article has its own animated sequence too.</p>
    <div className="category-atlas-choices" role="group" aria-label="Choose an animated topic">
      {CATEGORY_TOPICS.map((topic) => <button type="button" key={topic.slug} aria-pressed={slug === topic.slug} onClick={() => setSlug(topic.slug)}>{topic.label}</button>)}
    </div>
    <CategoryStory slug={slug} linkToArticle />
  </section>;
}
