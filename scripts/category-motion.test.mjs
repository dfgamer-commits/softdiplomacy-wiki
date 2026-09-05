import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { CATEGORY_TOPICS, CATEGORY_STEP_STOPS, categoryState, categoryScrollProgress } from '../app/categoryMotion.ts';

test('every main sidebar topic has an animation and a real article', () => {
  const expected = ['Combat', 'Gold', 'Buildings', 'Warship', 'Trade_Ship', 'Transport_Ship', 'Railroad', 'Air_Units', 'Airport_SoftDiplomacy', 'Passenger_Plane', 'Fighter_Jet', 'Attack_Helicopter'];
  assert.deepEqual(CATEGORY_TOPICS.map((topic) => topic.slug), expected);
  assert.equal(new Set(expected).size, CATEGORY_TOPICS.length);
  for (const topic of CATEGORY_TOPICS) {
    assert.ok(existsSync(new URL(`../public/content/pages/${topic.slug}.json`, import.meta.url)));
    assert.equal(topic.steps.length, 4);
    assert.equal(topic.captions.length, 4);
    assert.equal(topic.readouts.length, 4);
    assert.ok(topic.principle.length > 70);
    topic.captions.forEach((caption) => assert.ok(caption.length > 40));
  }
  assert.equal(new Set(CATEGORY_TOPICS.map((topic) => topic.scene)).size, 8);
});

test('phase buttons land within their matching chapters, including completion', () => {
  CATEGORY_STEP_STOPS.forEach((progress, index) => assert.equal(categoryState(progress).phase, index));
  assert.equal(categoryState(CATEGORY_STEP_STOPS[3]).outcome, 1);
});

test('every four-act story preserves prerequisite, action, interaction, and outcome order', () => {
  for (let i = 0; i <= 1000; i++) {
    const state = categoryState(i / 1000);
    if (state.action > 0) assert.equal(state.prepare, 1);
    if (state.interaction > 0) assert.equal(state.action, 1);
    if (state.outcome > 0) {
      assert.equal(state.action, 1);
      assert.equal(state.interaction, 1);
      assert.equal(state.arrival, true);
    }
  }
  assert.equal(categoryState(0.76).outcome, 0);
  assert.equal(categoryState(0.77).arrival, true);
});

test('fighters reach range before firing, and the target vanishes on impact', () => {
  for (let i = 0; i <= 1000; i++) {
    const state = categoryState(i / 1000);
    if (state.shotVisible) {
      assert.equal(state.prepare, 1);
      assert.equal(state.targetVisible, true);
      assert.equal(state.engaging, true);
    }
    if (!state.targetVisible) {
      assert.equal(state.shot, 1);
      assert.equal(state.shotVisible, false);
    }
  }
  assert.equal(categoryState(1).engaging, false);
});

test('helicopter ropes and troops wait for arrival, then advance only after all land', () => {
  for (let i = 0; i <= 1000; i++) {
    const state = categoryState(i / 1000);
    if (state.rope > 0) assert.equal(state.carrierAtObjective, true);
    if (state.descent.some((value) => value > 0)) assert.equal(state.rope, 1);
    if (state.groundAdvance > 0) assert.deepEqual(state.descent, [1, 1, 1]);
    assert.ok(state.descent[0] >= state.descent[1] && state.descent[1] >= state.descent[2]);
  }
});

test('progress is bounded and reversible without stale rewards or impact effects', () => {
  const forwards = Array.from({ length: 1001 }, (_, i) => categoryState(i / 1000));
  for (let i = 1000; i >= 0; i--) assert.deepEqual(categoryState(i / 1000), forwards[i]);
  assert.deepEqual(categoryState(NaN), categoryState(0));
  assert.deepEqual(categoryState(-1), categoryState(0));
  assert.deepEqual(categoryState(2), categoryState(1));
  for (const state of forwards) {
    for (const [name, value] of Object.entries(state)) {
      if (typeof value === 'number' && name !== 'phase') assert.ok(value >= 0 && value <= 1, name);
    }
  }
  assert.equal(categoryState(0).groundAdvance, 0);
  assert.equal(categoryState(0).outcome, 0);
});

test('sticky animation progress includes the fixed header and releases at the end', () => {
  assert.equal(categoryScrollProgress(100, 1500, 600, 88), 0);
  assert.equal(categoryScrollProgress(88, 1500, 600, 88), 0);
  assert.equal(categoryScrollProgress(-362, 1500, 600, 88), 0.5);
  assert.equal(categoryScrollProgress(-812, 1500, 600, 88), 1);
  assert.equal(categoryScrollProgress(-1000, 1500, 600, 88), 1);
});

test('integration leaves original HTML intact and adds both home and article sequences', () => {
  const wiki = readFileSync(new URL('../app/WikiApp.tsx', import.meta.url), 'utf8');
  assert.ok(wiki.includes('<CategoryAtlas />'));
  assert.ok(wiki.includes('<CategoryStory slug={slug} />'));
  assert.ok(wiki.includes('dangerouslySetInnerHTML={{ __html: page.html }}'));
  const component = readFileSync(new URL('../app/CategoryStory.tsx', import.meta.url), 'utf8');
  assert.ok(component.includes('getPointAtLength(distance)'));
  assert.ok(component.includes('media.addEventListener'));
  assert.ok(component.includes('media.removeEventListener'));
  assert.ok(component.includes('observer.disconnect()'));
  assert.ok(component.includes('window.cancelAnimationFrame(frame)'));
  assert.ok(component.includes('Why it matters'));
  assert.ok(!component.includes('setInterval'));
  assert.ok(!component.includes("addEventListener('wheel'"));
  const fleet = readFileSync(new URL('../app/AirFleetStory.tsx', import.meta.url), 'utf8');
  assert.ok(fleet.includes('fleet-doctrine'));
  assert.ok(fleet.includes('Required first'));
  assert.ok(fleet.includes('Mission ends when'));
  assert.ok(wiki.includes('Condition: original systems stay authoritative'));
  assert.ok(wiki.includes('Result: gold is paid only after arrival'));
});
