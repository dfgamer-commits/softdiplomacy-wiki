'use client';

import { impactFragment, sceneEnvelope, shockwave } from './cinematicMotion';
import { fleetMission } from './airFleetMotion';
import { categorySegment, categoryState } from './categoryMotion';

export function ImpactBurst({ progress, x, y }: { progress: number; x: number; y: number }) {
  return <g className="operation-impact" transform={`translate(${x} ${y})`}>
    {[0, 1, 2].map((index) => { const wave = shockwave(progress, index); return <circle key={index} r={wave.radius} opacity={wave.opacity} />; })}
    {Array.from({ length: 14 }, (_, index) => { const particle = impactFragment(progress, index); return <path key={index} d={`M 0 0 H ${4 + index % 4 * 2}`} transform={`translate(${particle.x} ${particle.y}) rotate(${particle.angle})`} opacity={particle.opacity} />; })}
  </g>;
}

export function DockPulse({ progress, x, y, gold = false }: { progress: number; x: number; y: number; gold?: boolean }) {
  return <g className={`operation-dock${gold ? ' operation-gold' : ''}`} transform={`translate(${x} ${y})`}>
    {[0, 1, 2].map((index) => { const wave = shockwave(progress, index); return <circle key={index} r={wave.radius} opacity={wave.opacity * 0.65} />; })}
    {gold && [0, 1, 2, 3, 4].map((index) => <rect key={index} x={-20 + index * 10} y={-38 - progress * (26 + index % 3 * 12)} width="5" height="8" rx="1" opacity={Math.sin(progress * Math.PI)} />)}
  </g>;
}

export function LandingField({ progress, x, y }: { progress: number; x: number; y: number }) {
  return <g className="operation-landing" transform={`translate(${x} ${y})`}>
    {[0, 1, 2].map((index) => <ellipse key={index} rx={15 + index * 13 + progress * 17} ry={5 + index * 5 + progress * 6} opacity={sceneEnvelope(progress, index * 0.1, 1) * 0.5} />)}
    <path d="M -40 -16 V -27 H -29 M 29 -27 H 40 V -16 M 40 16 V 27 H 29 M -29 27 H -40 V 16" opacity={sceneEnvelope(progress, 0, 1)} />
  </g>;
}

export function FleetEffects({ index, progress }: { index: number; progress: number }) {
  const state = fleetMission(index, progress);
  return <g className="operation-effects">
    <DockPulse x={130} y={230} progress={categorySegment(progress, 0.01, 0.2)} />
    {index === 0 && <>
      <DockPulse x={1070} y={230} progress={categorySegment(progress, 0.8, 0.92)} />
      {[130, 1070].map((x) => <DockPulse key={x} x={x} y={230} progress={categorySegment(progress, 0.92, 1)} gold />)}
    </>}
    {index === 1 && <>
      <g className="operation-scan" transform="translate(740 170)" opacity={sceneEnvelope(progress, 0.18, 0.52)}>
        <circle r="110" /><circle r="75" /><path d="M 0 0 L 91 -80 A 122 122 0 0 1 118 -30 Z" transform={`rotate(${-130 + state.enemyFlight * 145})`} />
      </g>
      <ImpactBurst x={870} y={170} progress={state.impact} />
    </>}
    {index === 2 && <LandingField x={1070} y={255} progress={categorySegment(progress, 0.6, 0.98)} />}
  </g>;
}

export function CategoryEffects({ scene, progress, air }: { scene: string; progress: number; air: boolean }) {
  const state = categoryState(progress);
  return <g className="operation-effects">
    {scene === 'intercept' && <>
      <g className="operation-scan" transform="translate(450 180)" opacity={sceneEnvelope(progress, 0.28, 0.61)}><circle r="160" /><path d="M 0 0 L 143 -70 A 160 160 0 0 1 158 -20 Z" transform={`rotate(${-40 + state.action * 55})`} /></g>
      <ImpactBurst x={620} y={180} progress={state.impact} />
    </>}
    {scene === 'trade' && <>
      <DockPulse x={110} y={180} progress={state.prepare} />
      {[110, 690].map((x) => <DockPulse key={x} x={x} y={180} progress={state.outcome} gold />)}
    </>}
    {scene === 'landing' && air && <LandingField x={580} y={220} progress={categorySegment(progress, 0.57, 0.98)} />}
    {scene === 'rail' && <DockPulse x={690} y={180} progress={state.interaction} />}
    {scene === 'construction' && <g className="operation-blueprint" opacity={sceneEnvelope(progress, 0.28, 0.8)}>
      <path d="M 310 90 H 470 M 310 218 H 470 M 310 82 V 226 M 470 82 V 226" />
      <path className="operation-build-scan" d={`M 314 ${218 - state.interaction * 125} H 466`} />
      {[0, 1, 2].map((index) => <rect key={index} x={326 + index * 47} y={215 - state.interaction * (65 + index * 19)} width="30" height="7" opacity={1 - state.interaction} />)}
    </g>}
    {scene === 'territory' && <path className="operation-front" d={`M ${365 + Math.floor(state.outcome * 3) * 63} 77 V 251`} opacity={state.action * (1 - state.outcome)} />}
  </g>;
}
