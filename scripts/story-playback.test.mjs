import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { advancePlayback, boundedProgress, campaignMissionProgress, viewportStoryProgress } from '../app/storyPlayback.ts';
import { fleetMission } from '../app/airFleetMotion.ts';

test('timeline accepts only finite bounded progress', () => {
  assert.equal(boundedProgress(-3), 0);
  assert.equal(boundedProgress(3), 1);
  assert.equal(boundedProgress(NaN), 0);
  assert.equal(boundedProgress(Infinity), 0);
  assert.equal(boundedProgress(0.54), 0.54);
});

test('playback advances at its duration and stops exactly at the end', () => {
  let progress = 0;
  for (let frame = 0; frame < 200; frame++) progress = advancePlayback(progress, 50, 10000);
  assert.equal(progress, 1);
  assert.equal(advancePlayback(1, 16, 10000), 1);
  assert.equal(advancePlayback(0, 0, 10000), 0);
});

test('background throttling cannot skip a scene and invalid time cannot rewind it', () => {
  assert.equal(advancePlayback(0.5, 600000, 10000), 0.5064);
  assert.equal(advancePlayback(0.5, -10, 10000), 0.5);
  assert.equal(advancePlayback(0.5, NaN, 10000), 0.5);
  assert.equal(advancePlayback(0.5, 50, Infinity), 0.5 + 50 / 14000);
});

test('unpinned small-screen scenes still follow scroll in both directions', () => {
  assert.equal(viewportStoryProgress(800, 400, 800), 0);
  assert.equal(viewportStoryProgress(-400, 400, 800), 1);
  const points = [600, 400, 200, 0, -200].map((top) => viewportStoryProgress(top, 400, 800));
  assert.deepEqual([...points].sort((a, b) => a - b), points);
  assert.equal(viewportStoryProgress(200, 400, 800), points[2]);
});

test('world map runs distinct trade, fighter, and insertion missions', () => {
  assert.deepEqual(campaignMissionProgress(0), [0, 0, 0]);
  assert.deepEqual(campaignMissionProgress(1), [1, 1, 1]);
  const trade = campaignMissionProgress(0.25);
  assert.ok(trade[0] > 0 && trade[0] < 1);
  assert.deepEqual(trade.slice(1), [0, 0]);
  const fighter = campaignMissionProgress(0.5);
  assert.equal(fighter[0], 1);
  assert.ok(fighter[1] > 0 && fighter[1] < 1);
  assert.equal(fighter[2], 0);
});

test('world-map effects follow arrival and disappear when rewound', () => {
  for (let frame = 0; frame <= 1000; frame++) {
    const missions = campaignMissionProgress(frame / 1000).map((p, i) => fleetMission(i, p));
    if (missions[0].goldOpacity > 0) assert.equal(missions[0].flight, 1);
    if (missions[1].projectileOpacity > 0) assert.equal(missions[1].flight, 1);
    if (missions[2].ropeOpacity > 0) assert.equal(missions[2].flight, 1);
  }
  const rewind = campaignMissionProgress(0).map((p, i) => fleetMission(i, p));
  assert.equal(rewind[0].goldOpacity, 0);
  assert.equal(rewind[1].projectileOpacity, 0);
  assert.equal(rewind[2].ropeOpacity, 0);
});

test('all story families expose accessible playback and preserve path-based motion', async () => {
  const controls = await readFile(new URL('../app/StoryControls.tsx', import.meta.url), 'utf8');
  assert.ok(controls.includes('type="range"'));
  assert.ok(controls.includes('aria-valuetext='));
  assert.ok(controls.includes('disabled={player.reducedMotion}'));
  assert.ok(controls.includes('visible && !document.hidden'));
  assert.ok(controls.includes('observer.disconnect()'));
  assert.ok(controls.includes('window.cancelAnimationFrame(frame)'));
  const category = await readFile(new URL('../app/CategoryStory.tsx', import.meta.url), 'utf8');
  assert.ok(category.includes('className="category-story" data-inspecting={inspecting}'));
  for (const filename of ['WikiApp.tsx', 'CategoryStory.tsx', 'AirFleetStory.tsx']) {
    const source = await readFile(new URL(`../app/${filename}`, import.meta.url), 'utf8');
    assert.ok(source.includes('<StoryControls'), filename);
    assert.ok(source.includes('getPointAtLength'), filename);
    assert.ok(!source.includes("addEventListener('wheel'"), filename);
  }
});
