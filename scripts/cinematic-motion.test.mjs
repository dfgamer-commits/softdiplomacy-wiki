import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shockwave, impactFragment, pathTailDistances, sceneEnvelope } from '../app/cinematicMotion.ts';

test('impact waves exist only during the hit and are deterministic when rewound', () => {
  for (let index = 0; index < 3; index++) {
    assert.equal(shockwave(0, index).opacity, 0);
    assert.equal(shockwave(1, index).opacity, 0);
    assert.ok(shockwave(0.5, index).opacity > 0);
    assert.ok(shockwave(0.8, index).radius > shockwave(0.5, index).radius);
    assert.deepEqual(shockwave(0.5, index), shockwave(0.5, index));
  }
});

test('impact fragments expand, fade, and never leave particles after completion', () => {
  for (let index = 0; index < 14; index++) {
    assert.equal(impactFragment(0, index).opacity, 0);
    assert.equal(impactFragment(1, index).opacity, 0);
    const near = impactFragment(0.2, index);
    const far = impactFragment(0.8, index);
    assert.ok(Math.hypot(far.x, far.y) > Math.hypot(near.x, near.y));
    assert.ok(far.opacity < near.opacity);
    assert.ok(Object.values(far).every(Number.isFinite));
  }
});

test('trail particles never lead the aircraft or fall outside the actual curve', () => {
  for (const length of [0, 5, 80, 400, 1400]) {
    for (let frame = 0; frame <= 100; frame++) {
      const progress = frame / 100;
      const tail = pathTailDistances(length, progress);
      assert.equal(tail.length, 12);
      tail.forEach((distance) => assert.ok(distance >= 0 && distance <= length * progress));
      assert.deepEqual([...tail].sort((a, b) => b - a), tail);
    }
  }
});

test('arrival and landing envelopes cannot run before their timeline interval', () => {
  assert.equal(sceneEnvelope(0.3, 0.6, 0.98), 0);
  assert.ok(sceneEnvelope(0.8, 0.6, 0.98) > 0);
  assert.ok(sceneEnvelope(1, 0.6, 0.98) < 1e-10);
  assert.equal(shockwave(NaN).opacity, 0);
  assert.equal(impactFragment(Infinity, 0).opacity, 0);
});

test('interactive introduction links to all aircraft and respects reduced motion', async () => {
  const source = await readFile(new URL('../app/IntroRadar.tsx', import.meta.url), 'utf8');
  for (const slug of ['Passenger_Plane', 'Fighter_Jet', 'Attack_Helicopter']) assert.ok(source.includes(slug));
  assert.ok(source.includes('getPointAtLength'));
  assert.ok(source.includes('tabIndex={0}'));
  assert.ok(source.includes('IntersectionObserver'));
  assert.ok(source.includes('reducedMotion ? 1 : player.progress'));
  assert.ok(source.includes('observer.disconnect()'));
});

test('cinematic effects stay tied to the established mission and article data', async () => {
  const effects = await readFile(new URL('../app/OperationEffects.tsx', import.meta.url), 'utf8');
  const wiki = await readFile(new URL('../app/WikiApp.tsx', import.meta.url), 'utf8');
  const category = await readFile(new URL('../app/CategoryStory.tsx', import.meta.url), 'utf8');
  assert.ok(effects.includes('fleetMission(index, progress)'));
  assert.ok(effects.includes('progress={state.impact}'));
  assert.ok(effects.includes('categorySegment(progress, 0.92, 1)'));
  assert.ok(wiki.includes('<IntroRadar />'));
  assert.ok(wiki.includes('dangerouslySetInnerHTML={{ __html: page.html }}'));
  assert.ok(category.includes('nose - offset'));
  assert.ok(category.includes('pathTailDistances(length, progress, 12, 85)'));
  assert.ok(category.lastIndexOf('<CategoryEffects') > category.lastIndexOf("topic.scene === 'network'"));
});
