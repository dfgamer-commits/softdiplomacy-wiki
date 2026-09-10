import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { immersivePose, wheelTimeline } from '../app/immersiveCamera.ts';
import { buildOperationModel } from '../app/operationWorld.ts';

const options = { kind: 'trade', air: true, progress: 0.5, subject: { x: 0, y: 1.8, z: 0 }, heading: Math.PI / 2, attention: { x: 6, y: 1, z: 2 } };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('ride camera stays close to and behind a moving subject', () => {
  for (const kind of ['trade', 'landing', 'intercept', 'rail', 'network']) {
    for (let i = 0; i <= 100; i++) {
      const heading = i / 100 * Math.PI * 2;
      const pose = immersivePose({ ...options, kind, heading });
      assert.ok(distance(pose.position, options.subject) < 7);
      const forwardDot = (pose.position.x - options.subject.x) * Math.sin(heading) + (pose.position.z - options.subject.z) * Math.cos(heading);
      assert.ok(forwardDot < -3);
      assert.ok(pose.position.y >= 1.1);
      assert.ok(pose.fov >= 55 && pose.fov <= 65);
    }
  }
});

test('parallax changes viewpoint without changing the subject or gameplay state', () => {
  const original = structuredClone(options);
  const left = immersivePose({ ...options, lookX: -1 });
  const right = immersivePose({ ...options, lookX: 1 });
  assert.ok(distance(left.position, right.position) > 1);
  assert.deepEqual(options, original);
});

test('calm view is independent of motion, progress and pointer position', () => {
  const a = immersivePose({ ...options, calm: true, progress: 0, lookX: -1 });
  const b = immersivePose({ ...options, calm: true, progress: 1, lookX: 1, subject: { x: 10, y: 5, z: 12 } });
  assert.deepEqual(a, b);
});

test('all topic cameras remain finite, upright and reversible', () => {
  for (const kind of ['trade', 'landing', 'intercept', 'rail', 'network', 'territory', 'construction', 'economy']) {
    let previous;
    for (let i = 0; i <= 1000; i++) {
      const pose = immersivePose({ ...options, kind, progress: i / 1000 });
      assert.ok([...Object.values(pose.position), ...Object.values(pose.target), pose.fov].every(Number.isFinite));
      assert.ok(pose.position.y >= 1.1);
      if (previous) assert.ok(distance(pose.position, previous.position) < 0.15);
      previous = pose;
    }
    const a = immersivePose({ ...options, kind, progress: 0.25 });
    immersivePose({ ...options, kind, progress: 1 });
    assert.deepEqual(immersivePose({ ...options, kind, progress: 0.25 }), a);
  }
});

test('rail camera follows the articulated engine, not an unrelated route', () => {
  const model = buildOperationModel('rail', false);
  model.setState({ flight: 0.5, prepare: 1, interact: 0.5, outcome: 0, shot: 0, shotVisible: false, impact: 0, targetVisible: true, engaging: false, rope: 0, descent: [0, 0, 0], advance: 0, carrierOpacity: 1, connection: 1 });
  const viewpoint = model.viewpoint();
  assert.equal(viewpoint.subject, model.train[0].position);
  assert.equal(viewpoint.heading, model.train[0].rotation.y);
  model.dispose();
});

test('full-screen wheel scrubbing is bounded and supports pixel, line and page deltas', () => {
  assert.equal(wheelTimeline(0, -100, 0), 0);
  assert.equal(wheelTimeline(1, 100, 0), 1);
  assert.equal(wheelTimeline(0.5, 16, 0), wheelTimeline(0.5, 1, 1));
  assert.ok(wheelTimeline(0.5, 1, 2) > 0.5);
  assert.equal(wheelTimeline(0.5, NaN, 0), 0.5);
});

test('immersive controls retain accessibility, reduced motion, cleanup, and a wide-view fallback', async () => {
  const ui = await readFile(new URL('../app/OperationsViewport.tsx', import.meta.url), 'utf8');
  assert.ok(ui.includes('document.fullscreenElement !== root'));
  assert.ok(ui.includes('event.ctrlKey'));
  assert.ok(ui.includes("!event.target.closest('.operations-viewport')"));
  assert.ok(ui.includes("document.removeEventListener('fullscreenchange', sync)"));
  assert.ok(ui.includes('setExpanded(true)'));
  assert.ok(ui.includes('playback?.reducedMotion'));
  assert.ok(ui.includes('operations-fullscreen-playback'));
  for (const file of ['IntroRadar', 'AirFleetStory', 'CategoryStory']) assert.ok((await readFile(new URL(`../app/${file}.tsx`, import.meta.url), 'utf8')).includes('playback={player}'));
});
