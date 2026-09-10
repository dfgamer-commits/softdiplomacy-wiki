'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CameraMode, WorldKind, WorldState, createOperationWorld } from './operationWorld';
import { CATEGORY_TOPICS, categoryState } from './categoryMotion';
import { fleetMission } from './airFleetMotion';
import { applyOperationTiming } from './operationTiming';
import StoryControls from './StoryControls';
import type { StoryPlayer } from './StoryControls';
import { wheelTimeline } from './immersiveCamera';

export default function OperationsViewport({ kind, progress, air = false, fleet = false, fallback, playback }: { kind: WorldKind; progress: number; air?: boolean; fleet?: boolean; fallback: ReactNode; playback?: StoryPlayer }) {
  const workbenchRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createOperationWorld> | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState<CameraMode>('ride');
  const cameraRef = useRef<CameraMode>('ride');
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [calm, setCalm] = useState(false);
  const [screenMessage, setScreenMessage] = useState('');
  const quiet = calm || Boolean(playback?.reducedMotion);
  const quietRef = useRef(quiet);
  const playbackRef = useRef(playback);
  const wheelProgressRef = useRef(playback?.progress ?? 0);
  useEffect(() => { playbackRef.current = playback; wheelProgressRef.current = playback?.progress ?? 0; }, [playback]);
  useEffect(() => { quietRef.current = quiet; sceneRef.current?.comfort(quiet); }, [quiet]);
  useEffect(() => {
    const root = workbenchRef.current;
    if (!root) return;
    let wasFullscreen = false;
    const sync = () => { const active = document.fullscreenElement === root; setFullscreen(active); if (wasFullscreen && !active) { const player = playbackRef.current; if (player?.playing) player.seek(player.progress); } wasFullscreen = active; };
    const wheel = (event: WheelEvent) => {
      if (document.fullscreenElement !== root || event.ctrlKey || !playbackRef.current || !(event.target instanceof HTMLElement) || !event.target.closest('.operations-viewport') || event.target.closest('input,button,a')) return;
      event.preventDefault(); const player = playbackRef.current; wheelProgressRef.current = wheelTimeline(wheelProgressRef.current, event.deltaY, event.deltaMode); player.seek(wheelProgressRef.current);
    };
    document.addEventListener('fullscreenchange', sync); root.addEventListener('wheel', wheel, { passive: false });
    return () => { document.removeEventListener('fullscreenchange', sync); root.removeEventListener('wheel', wheel); };
  }, []);
  const [inspected, setInspected] = useState('');
  const [detail, setDetail] = useState<number | null>(null);
  const topic = CATEGORY_TOPICS.find((entry) => entry.scene === kind && Boolean(entry.air) === air);
  const phase = fleet ? fleetMission(kind === 'intercept' ? 1 : kind === 'landing' ? 2 : 0, progress).phase : categoryState(progress).phase;
  const details = kind === 'trade' ? ['Origin & eligibility', 'Route & delivery', 'Payment to both owners'] : kind === 'intercept' ? ['Launch support', 'Range & shell', 'Target & result'] : kind === 'landing' ? ['Troop reserve', 'Carried payload', 'Ground handoff'] : kind === 'rail' ? ['Station', 'Track & carriages', 'Connected destination'] : kind === 'territory' ? ['Reserve', 'Committed attack', 'Territory boundary'] : kind === 'network' ? ['Trade', 'Patrol', 'Insertion'] : ['Gold', 'City', 'Capacity'];
  const detailTopic = kind === 'network' && detail !== null ? CATEGORY_TOPICS.find((entry) => entry.slug === ['Passenger_Plane', 'Fighter_Jet', 'Attack_Helicopter'][detail]) : topic;
  const detailStep = detail === null ? phase : kind === 'network' ? [3, 2, 3][detail] : kind === 'landing' ? [0, 1, 3][detail] : [0, 2, 3][detail];
  const citation = detailTopic?.wikiSources?.[detailStep];
  const selectDetail = (value: number | null) => { setDetail(value); sceneRef.current?.focus(value); };
  const latest = useRef({ progress, kind, air, fleet });
  useEffect(() => { latest.current = { progress, kind, air, fleet }; sceneRef.current?.update(stateFor(kind, progress, fleet), progress); }, [progress, kind, air, fleet]);
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    let disposed = false, started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return; started = true; setReady(false);
      void import('./operationWorld').then(({ createOperationWorld: create }) => {
        if (disposed) return;
        try { const scene = create(host, kind, air, setInspected, () => { setReady(false); setFailed(true); }, (id) => { setDetail(id); sceneRef.current?.focus(id); }); sceneRef.current = scene; const value = latest.current; scene.update(stateFor(value.kind, value.progress, value.fleet), value.progress); scene.comfort(quietRef.current); scene.camera(cameraRef.current); setReady(true); setFailed(false); setDetail(null); }
        catch { setFailed(true); }
      }).catch(() => { if (!disposed) setFailed(true); });
    }, { rootMargin: '160px' }); observer.observe(host);
    return () => { disposed = true; observer.disconnect(); sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [kind, air]);
  const changeCamera = (mode: CameraMode) => { cameraRef.current = mode; setCamera(mode); sceneRef.current?.camera(mode); };
  const enterScene = async () => {
    const root = workbenchRef.current; if (!root) return;
    setScreenMessage('');
    if (document.fullscreenElement === root) { await document.exitFullscreen().catch(() => setScreenMessage('Use Esc to leave full screen.')); return; }
    if (expanded) { setExpanded(false); return; }
    changeCamera('ride'); playbackRef.current?.seek(playbackRef.current.progress);
    try {
      if (!document.fullscreenEnabled || !root.requestFullscreen) throw new Error('Unavailable');
      await root.requestFullscreen();
      if (!quietRef.current) playbackRef.current?.togglePlay();
    } catch { setExpanded(true); setScreenMessage('Full screen is unavailable here. Wide view is open instead.'); root.scrollIntoView({ block: 'start', behavior: 'instant' }); }
  };
  return <div className="operations-workbench" ref={workbenchRef} data-fullscreen={fullscreen} data-expanded={expanded} onKeyDown={(event) => { if (event.key === 'Escape' && expanded) setExpanded(false); }}><div className="operations-viewport" data-ready={ready} data-camera={camera} data-calm={quiet}>
    <div className="operations-canvas" ref={hostRef} aria-hidden="true" />
    <div className="operations-fallback" hidden={ready}>{fallback}</div>
    {ready && <>
      <div className="operations-corner"><span>{topic?.steps[phase]}</span><span>SCHEMATIC · NOT TO SCALE</span></div>
      <div className="operations-inspect" aria-live="polite">{inspected ? `${inspected} · click to inspect` : (quiet ? 'Calm view · use the timeline' : camera === 'ride' ? 'Move to look around · click a model to inspect' : camera === 'orbit' ? 'Drag to explore · click a model to inspect' : 'Scroll to advance · click a model to inspect')}</div>
      <div className="operations-camera" role="group" aria-label="Scene camera">
        <div>{(['ride', 'cinematic', 'orbit', 'top'] as const).map((mode) => <button type="button" key={mode} aria-pressed={camera === mode} onClick={() => changeCamera(mode)}>{mode === 'ride' ? 'Ride along' : mode === 'cinematic' ? 'Overview' : mode === 'orbit' ? 'Explore' : 'Top'}</button>)}</div>
        <div><button type="button" className="operations-enter" onClick={() => void enterScene()}>{fullscreen ? 'Exit full screen' : expanded ? 'Exit wide view' : 'Enter scene ↗'}</button><button type="button" aria-label="Calm camera view" aria-pressed={quiet} disabled={Boolean(playback?.reducedMotion)} onClick={() => setCalm(!calm)}>Calm view</button></div>
        {camera === 'orbit' && <div><button type="button" aria-label="Rotate scene left" onClick={() => sceneRef.current?.rotate(-0.25)}>&#8634;</button><button type="button" aria-label="Rotate scene right" onClick={() => sceneRef.current?.rotate(0.25)}>&#8635;</button><button type="button" aria-label="Zoom in" onClick={() => sceneRef.current?.zoom(-0.1)}>+</button><button type="button" aria-label="Zoom out" onClick={() => sceneRef.current?.zoom(0.1)}>&minus;</button></div>}
      </div>
    </>}
    {failed && <p className="operations-unavailable">3D is unavailable in this browser. The interactive diagram is shown instead.</p>}
  </div>
    {screenMessage && <p className="operations-screen-message" role="status">{screenMessage}</p>}
    {fullscreen && playback && <div className="operations-fullscreen-playback"><StoryControls player={playback} label={topic?.label ?? 'Scene'} phase={topic?.steps[phase] ?? 'Operation'} /><p>Scroll or use the timeline · Move your pointer to look around · Esc exits</p></div>}
    <div className="operations-meaning">
      <div className="operations-key"><span><i className="meaning-owned" />Owned / route</span>{['trade', 'landing', 'economy', 'construction'].includes(kind) && <span><i className="meaning-payload" />{kind === 'landing' ? 'Committed troops' : 'Gold'}</span>}{['intercept', 'territory'].includes(kind) && <span><i className="meaning-hostile" />Hostile / contested</span>}</div>
      <div className="operations-details" role="group" aria-label="Inspect the meaning of scene details">{details.map((label, index) => <button type="button" key={label} aria-pressed={detail === index} onClick={() => selectDetail(detail === index ? null : index)}><span>0{index + 1}</span>{label}</button>)}</div>
      {detail !== null && detailTopic && <div className="operations-explanation"><strong>{details[detail]}</strong><p>{detailTopic.captions[detailStep]}</p><a href={citation ? `https://openfront.wiki/${encodeURIComponent(citation[0])}${citation[1] ? `#${encodeURIComponent(citation[1])}` : ''}` : `#/article/${detailTopic.slug}`} {...(citation ? { target: '_blank', rel: 'noreferrer' } : {})}>{citation ? 'Read the original wiki source ↗' : 'Read the air-unit rules →'}</a><button type="button" onClick={() => selectDetail(null)} aria-label="Close scene explanation">Close</button></div>}
      <p className="operations-scale-note">{kind === 'landing' ? 'Troop markers represent groups, not exact counts. Ropes illustrate the handoff, not a game mechanic.' : kind === 'intercept' ? 'The ring shows targeting range. Scale and timing are illustrative; the projectile is a shell.' : kind === 'trade' || kind === 'economy' || kind === 'construction' ? 'Gold stacks show where money goes, not an exact amount. Timing and scale are illustrative.' : kind === 'territory' ? 'Troop markers represent groups. This example is not a combat calculator.' : 'Position and timing explain the sequence; they are not measured game values.'}</p>
    </div>
  </div>;
}

export function stateFor(kind: WorldKind, progress: number, fleet: boolean): WorldState {
  if (fleet) { const s = fleetMission(kind === 'intercept' ? 1 : kind === 'landing' ? 2 : 0, progress); return applyOperationTiming(kind, { flight: s.flight, prepare: s.readiness, interact: s.weaponCycle, outcome: kind === 'trade' ? s.goldOpacity : kind === 'landing' ? s.troopsOpacity : s.threatCleared, shot: s.projectile, shotVisible: s.projectileOpacity > 0, impact: s.impact, targetVisible: s.targetOpacity > 0.1, engaging: s.inCombat, rope: s.ropeLength, descent: s.rappellers.map((r) => r.descent), advance: s.troopsOpacity, carrierOpacity: s.aircraftOpacity }, progress, true); }
  const s = categoryState(progress); return applyOperationTiming(kind, { flight: s.action, prepare: s.prepare, interact: s.interaction, outcome: s.outcome, shot: s.shot, shotVisible: s.shotVisible, impact: s.impact, targetVisible: s.targetVisible, engaging: s.engaging, rope: s.rope, descent: s.descent, advance: s.groundAdvance, carrierOpacity: kind === 'landing' || kind === 'trade' ? 1 - s.outcome : 1 }, progress, false);
}
