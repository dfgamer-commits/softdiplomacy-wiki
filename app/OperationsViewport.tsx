'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CameraMode, WorldKind, WorldState, createOperationWorld } from './operationWorld';
import { categoryState } from './categoryMotion';
import { fleetMission } from './airFleetMotion';

export default function OperationsViewport({ kind, progress, air = false, fleet = false, fallback }: { kind: WorldKind; progress: number; air?: boolean; fleet?: boolean; fallback: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createOperationWorld> | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState<CameraMode>('cinematic');
  const cameraRef = useRef<CameraMode>('cinematic');
  const [inspected, setInspected] = useState('');
  const latest = useRef({ progress, kind, air, fleet });
  useEffect(() => { latest.current = { progress, kind, air, fleet }; sceneRef.current?.update(stateFor(kind, progress, fleet), progress); }, [progress, kind, air, fleet]);
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    let disposed = false, started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return; started = true; setReady(false);
      void import('./operationWorld').then(({ createOperationWorld: create }) => {
        if (disposed) return;
        try { const scene = create(host, kind, air, setInspected, () => { setReady(false); setFailed(true); }); sceneRef.current = scene; const value = latest.current; scene.update(stateFor(value.kind, value.progress, value.fleet), value.progress); scene.camera(cameraRef.current); setReady(true); }
        catch { setFailed(true); }
      }).catch(() => { if (!disposed) setFailed(true); });
    }, { rootMargin: '160px' }); observer.observe(host);
    return () => { disposed = true; observer.disconnect(); sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [kind, air]);
  const changeCamera = (mode: CameraMode) => { cameraRef.current = mode; setCamera(mode); sceneRef.current?.camera(mode); };
  return <div className="operations-viewport" data-ready={ready} data-camera={camera}>
    <div className="operations-canvas" ref={hostRef} aria-hidden="true" />
    <div className="operations-fallback" hidden={ready}>{fallback}</div>
    {ready && <>
      <div className="operations-corner"><span>OPERATIONS / 3D</span><span>ILLUSTRATIVE · NOT TO SCALE</span></div>
      <div className="operations-inspect" aria-live="polite">{inspected || (camera === 'orbit' ? 'Drag to explore the scene' : 'Scroll to advance the operation')}</div>
      <div className="operations-camera" role="group" aria-label="Scene camera">
        <div>{(['cinematic', 'orbit', 'top'] as const).map((mode) => <button type="button" key={mode} aria-pressed={camera === mode} onClick={() => changeCamera(mode)}>{mode === 'cinematic' ? 'Follow' : mode === 'orbit' ? 'Explore 3D' : 'Top view'}</button>)}</div>
        <div><button type="button" aria-label="Rotate scene left" onClick={() => { changeCamera('orbit'); sceneRef.current?.rotate(-0.25); }}>&#8634;</button><button type="button" aria-label="Rotate scene right" onClick={() => { changeCamera('orbit'); sceneRef.current?.rotate(0.25); }}>&#8635;</button><button type="button" aria-label="Zoom in" onClick={() => sceneRef.current?.zoom(-0.1)}>+</button><button type="button" aria-label="Zoom out" onClick={() => sceneRef.current?.zoom(0.1)}>&minus;</button></div>
      </div>
    </>}
    {failed && <p className="operations-unavailable">3D is unavailable in this browser. The interactive diagram is shown instead.</p>}
  </div>;
}

export function stateFor(kind: WorldKind, progress: number, fleet: boolean): WorldState {
  if (fleet) { const s = fleetMission(kind === 'intercept' ? 1 : kind === 'landing' ? 2 : 0, progress); return { flight: s.flight, prepare: s.readiness, interact: s.weaponCycle, outcome: kind === 'trade' ? s.goldOpacity : kind === 'landing' ? s.troopsOpacity : s.threatCleared, shot: s.projectile, shotVisible: s.projectileOpacity > 0, impact: s.impact, targetVisible: s.targetOpacity > 0.1, engaging: s.inCombat, rope: s.ropeLength, descent: s.rappellers.map((r) => r.descent), advance: s.troopsOpacity, carrierOpacity: s.aircraftOpacity }; }
  const s = categoryState(progress); return { flight: s.action, prepare: s.prepare, interact: s.interaction, outcome: s.outcome, shot: s.shot, shotVisible: s.shotVisible, impact: s.impact, targetVisible: s.targetVisible, engaging: s.engaging, rope: s.rope, descent: s.descent, advance: s.groundAdvance, carrierOpacity: kind === 'landing' || kind === 'trade' ? 1 - s.outcome : 1 };
}
