'use client';

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { advancePlayback, boundedProgress } from './storyPlayback';

const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const getReducedMotion = () => window.matchMedia(motionQuery).matches;

export function useStoryPlayer(rootRef: RefObject<HTMLElement | null>, duration = 14000) {
  const progressRef = useRef(0);
  const manualRef = useRef<number | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const [view, setView] = useState({ progress: 0, manual: false, playing: false });
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => false);

  useEffect(() => subscribeMotion(() => {
    if (getReducedMotion()) setView((previous) => ({ ...previous, playing: false }));
    refreshRef.current();
  }), []);

  const sample = useCallback((scrollProgress: number) => {
    const progress = boundedProgress(manualRef.current ?? scrollProgress);
    progressRef.current = progress;
    setView((previous) => Math.abs(progress - previous.progress) < 0.0001 ? previous : { ...previous, progress });
    return progress;
  }, []);
  const seek = useCallback((value: number) => {
    const progress = boundedProgress(value);
    manualRef.current = progress;
    progressRef.current = progress;
    setView({ progress, manual: true, playing: false });
    refreshRef.current();
  }, []);
  const followScroll = useCallback(() => {
    manualRef.current = null;
    setView((previous) => ({ ...previous, manual: false, playing: false }));
    refreshRef.current();
  }, []);
  const togglePlay = useCallback(() => {
    const progress = progressRef.current >= 0.999 ? 0 : progressRef.current;
    manualRef.current = progress;
    progressRef.current = progress;
    setView((previous) => ({ progress, manual: true, playing: !previous.playing }));
    refreshRef.current();
  }, []);

  useEffect(() => {
    if (!view.playing || reducedMotion) return;
    let frame = 0;
    let last = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    if (rootRef.current) observer.observe(rootRef.current);
    const tick = (now: number) => {
      const elapsed = last ? now - last : 0;
      last = now;
      if (visible && !document.hidden) {
        const progress = advancePlayback(progressRef.current, elapsed, duration);
        manualRef.current = progress;
        progressRef.current = progress;
        refreshRef.current();
        if (progress >= 1) {
          setView({ progress: 1, manual: true, playing: false });
          return;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [view.playing, reducedMotion, duration, rootRef]);

  return { ...view, playing: view.playing && !reducedMotion, reducedMotion, sample, seek, followScroll, togglePlay, refreshRef };
}

export type StoryPlayer = ReturnType<typeof useStoryPlayer>;

export default function StoryControls({ player, label, phase }: { player: StoryPlayer; label: string; phase: string }) {
  const id = useId();
  return <div className="story-player" role="group" aria-label={`${label} animation controls`}>
    <div className="story-player-actions">
      <button type="button" className="story-play" onClick={player.togglePlay} disabled={player.reducedMotion} aria-label={`${player.playing ? 'Pause' : 'Play'} ${label} animation`}>
        <span aria-hidden="true">{player.playing ? 'Ⅱ' : '▶'}</span>{player.playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={() => player.seek(0)} aria-label={`Rewind ${label} animation`}><span aria-hidden="true">↶</span> Rewind</button>
    </div>
    <div className="story-scrubber">
      <label htmlFor={id}><span>{phase}</span><output>{Math.round(player.progress * 100)}%</output></label>
      <input id={id} type="range" min="0" max="1000" step="1" value={Math.round(player.progress * 1000)} aria-label={`${label} timeline`} aria-valuetext={`${Math.round(player.progress * 100)} percent — ${phase}`} style={{ '--scrub-progress': `${player.progress * 100}%` } as CSSProperties} onChange={(event) => player.seek(Number(event.target.value) / 1000)} />
    </div>
    <button type="button" className="story-scroll-mode" aria-pressed={!player.manual} onClick={player.followScroll}>{player.manual ? 'Follow scroll' : 'Scroll linked'} <span aria-hidden="true">↕</span></button>
    <p className="story-player-help">{player.reducedMotion ? 'Reduced motion: use the timeline or chapter buttons.' : player.manual ? 'You’re in control. Drag the timeline to inspect any moment.' : 'Scroll to explore, or take control with Play and the timeline.'}</p>
  </div>;
}
