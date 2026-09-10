'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useStoryPlayer } from './StoryControls';
import { boundedProgress } from './storyPlayback';
import OperationsViewport from './OperationsViewport';
import { fleetMotion } from './airFleetMotion';

const contacts = [
  { slug: 'Passenger_Plane', name: 'Passenger plane', path: 'M 250 420 C 80 350 35 210 128 150', points: '17,0 -12,11 -12,-11', color: '#79eaf5' },
  { slug: 'Fighter_Jet', name: 'Fighter jet', path: 'M 80 335 C 180 80 320 70 374 214', points: '17,0 5,16 -14,10 -14,-10 5,-16', color: '#ff957c' },
  { slug: 'Attack_Helicopter', name: 'Attack helicopter', path: 'M 125 70 C 445 55 445 350 268 369', points: '17,0 -12,11 -12,-11', color: '#ffd079' },
];

export default function IntroRadar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const paths = useRef<Array<SVGPathElement | null>>([]);
  const markers = useRef<Array<SVGGElement | null>>([]);
  const player = useStoryPlayer(rootRef, 26000);
  const { sample, togglePlay, refreshRef, reducedMotion } = player;
  const progress = reducedMotion ? 1 : player.progress;
  const mission = fleetMotion(progress);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    refreshRef.current = () => { sample(0); };
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        started = true;
        togglePlay();
      }
    }, { threshold: 0.15 });
    observer.observe(root);
    return () => { observer.disconnect(); refreshRef.current = () => {}; };
  }, [sample, togglePlay, refreshRef]);

  useLayoutEffect(() => {
    contacts.forEach((_, index) => {
      const path = paths.current[index];
      if (!path) return;
      const local = boundedProgress((progress - index * 0.1) / 0.7);
      const eased = local * local * (3 - 2 * local);
      const length = path.getTotalLength();
      const distance = length * eased;
      const point = path.getPointAtLength(distance);
      const from = path.getPointAtLength(Math.max(0, distance - 2));
      const to = path.getPointAtLength(Math.min(length, distance + 2));
      markers.current[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI})`);
      path.style.strokeDashoffset = String(100 - eased * 100);
    });
  }, [progress]);

  return <div className="intro-radar" ref={rootRef} data-playing={player.playing} onPointerMove={(event) => {
    if (event.pointerType !== 'mouse' || reducedMotion) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--radar-x', `${(event.clientX - box.left) / box.width * 8 - 4}deg`);
    event.currentTarget.style.setProperty('--radar-y', `${4 - (event.clientY - box.top) / box.height * 8}deg`);
  }} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--radar-x', '0deg'); event.currentTarget.style.setProperty('--radar-y', '0deg'); }}>
    <div className="intro-radar-surface">
      <OperationsViewport playback={player} kind={(['trade', 'intercept', 'landing'] as const)[mission.active]} progress={mission.flights[mission.active]} air fleet fallback={<svg viewBox="0 0 500 500" role="group" aria-label="Explore the three air units">
        <defs><radialGradient id="intro-radar-light"><stop stopColor="#154856" /><stop offset="1" stopColor="#081923" /></radialGradient></defs>
        <circle className="intro-radar-disc" cx="250" cy="250" r="225" fill="url(#intro-radar-light)" />
        {[75, 145, 211, 230].map((radius) => <circle key={radius} className="intro-radar-ring" cx="250" cy="250" r={radius} />)}
        <path className="intro-radar-cross" d="M 25 250 H 475 M 250 25 V 475" />
        <g className="intro-radar-ticks">{Array.from({ length: 60 }, (_, index) => <path key={index} d={`M 250 22 V ${index % 5 ? 28 : 35}`} transform={`rotate(${index * 6} 250 250)`} />)}</g>
        <path className="intro-radar-sweep" d="M 250 250 L 250 25 A 225 225 0 0 1 365 57 Z" transform={`rotate(${progress * 440 - 50} 250 250)`} />
        {contacts.map((contact, index) => <a key={contact.slug} href={`#/article/${contact.slug}`} aria-label={`Explore ${contact.name}`} tabIndex={0} className="intro-radar-contact" style={{ color: contact.color }}>
          <title>{contact.name}</title>
          <path className="intro-contact-guide" d={contact.path} />
          <path ref={(node) => { paths.current[index] = node; }} className="intro-contact-route" d={contact.path} pathLength="100" />
          <g ref={(node) => { markers.current[index] = node; }}>
            <circle className="intro-contact-halo" r="31" />
            <path className="intro-contact-exhaust" d="M -20 0 H -48 M -20 -5 H -34 M -20 5 H -34" />
            <polygon points={contact.points} />
            {index === 1 && <polygon className="intro-contact-core" points="9,0 3,8 -7,5 -7,-5 3,-8" />}
          </g>
        </a>)}
        <circle className="intro-radar-origin" cx="250" cy="250" r="5" />
      </svg>} />
      <div className="intro-radar-caption"><span>AIR OPERATIONS</span><span>01 / 02 / 03</span></div>
    </div>
    <div className="intro-radar-legend">{contacts.map((contact, index) => <a key={contact.slug} href={`#/article/${contact.slug}`} style={{ color: contact.color }}><span>0{index + 1}</span>{contact.name}</a>)}</div>
    {!reducedMotion && <button className="intro-replay" type="button" onClick={player.togglePlay}>{player.playing ? 'Pause introduction' : player.progress >= 1 ? 'Replay introduction' : 'Play introduction'} <span aria-hidden="true">&#8594;</span></button>}
  </div>;
}
