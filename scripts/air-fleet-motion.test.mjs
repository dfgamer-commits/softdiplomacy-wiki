import assert from 'node:assert/strict';
import test from 'node:test';
import { FLEET_CHAPTER_STOPS, fleetMission, fleetMotion, fleetScrollProgress } from '../app/airFleetMotion.ts';

test('each aircraft has its own left-to-right flight and readable chapter hold', () => {
  FLEET_CHAPTER_STOPS.forEach((progress, index) => {
    const motion = fleetMotion(progress);
    assert.equal(motion.active, index);
    assert.equal(motion.chapter, index);
    assert.ok(Math.abs(motion.flights[index] - 0.5) < 1e-10);
  });
});

test('scroll motion is bounded, continuous, reversible and reaches all destinations', () => {
  let previous = fleetMotion(0);
  for (let i = 1; i <= 1000; i++) {
    const current = fleetMotion(i / 1000);
    assert.ok(current.chapter >= previous.chapter);
    assert.ok(current.chapter - previous.chapter < 0.02);
    current.flights.forEach((flight, index) => {
      assert.ok(flight >= previous.flights[index] && flight <= 1);
    });
    previous = current;
  }
  assert.deepEqual(fleetMotion(-1), fleetMotion(0));
  assert.deepEqual(fleetMotion(2), fleetMotion(1));
  assert.deepEqual(fleetMotion(NaN), fleetMotion(0));
  assert.deepEqual(fleetMotion(1).flights, [1, 1, 1]);
  assert.deepEqual(fleetMotion(0).flights, [0, 0, 0]);
  assert.equal(fleetMotion(0.5).chapter, 1);
});

test('sticky progress accounts for the header and the exact release point', () => {
  assert.equal(fleetScrollProgress(200, 3000, 700, 88), 0);
  assert.equal(fleetScrollProgress(88, 3000, 700, 88), 0);
  assert.equal(fleetScrollProgress(88 - 1150, 3000, 700, 88), 0.5);
  assert.equal(fleetScrollProgress(88 - 2300, 3000, 700, 88), 1);
  assert.ok(Number.isFinite(fleetScrollProgress(0, 700, 700, 88)));
});

test('trade rewards follow arrival, and the completed plane disappears', () => {
  assert.equal(fleetMission(0, 0.5).phase, 1);
  assert.equal(fleetMission(0, 0.5).goldOpacity, 0);
  assert.equal(fleetMission(0, 0.85).flight, 1);
  assert.equal(fleetMission(0, 0.85).goldOpacity, 0);
  assert.equal(fleetMission(0, 1).goldOpacity, 1);
  assert.equal(fleetMission(0, 1).aircraftOpacity, 0);
});

test('fighter stops at range, fires one shell, then removes the target', () => {
  assert.equal(fleetMission(1, 0.45).flight, 1);
  assert.equal(fleetMission(1, 0.45).enemyFlight, 1);
  assert.equal(fleetMission(1, 0.45).inCombat, true);
  assert.equal(fleetMission(1, 0.6).projectileOpacity, 1);
  assert.equal(fleetMission(1, 0.6).targetOpacity, 1);
  assert.equal(fleetMission(1, 0.8).targetOpacity, 0);
  assert.equal(fleetMission(1, 1).inCombat, false);
  assert.ok(fleetMission(1, 0.46).lockOpacity > 0);
  assert.equal(fleetMission(1, 0.6).targetHealth, 1);
  assert.equal(fleetMission(1, 0.82).targetHealth, 0);
  assert.equal(fleetMission(1, 1).threatCleared, 1);
});

test('troops only appear after landing and consuming the helicopter', () => {
  assert.equal(fleetMission(2, 0).payloadOpacity, 1);
  assert.equal(fleetMission(2, 0.2).payloadOpacity, 0);
  assert.equal(fleetMission(2, 0.5).troopsOpacity, 0);
  assert.equal(fleetMission(2, 0.9).troopsOpacity, 0);
  assert.equal(fleetMission(2, 1).flight, 1);
  assert.equal(fleetMission(2, 1).aircraftOpacity, 0);
  assert.equal(fleetMission(2, 1).troopsOpacity, 1);
});

test('rope deploys under the stopped helicopter before three staggered descents', () => {
  assert.equal(fleetMission(2, 0.5).ropeLength, 0);
  const rope = fleetMission(2, 0.66);
  assert.equal(rope.flight, 1);
  assert.ok(rope.ropeLength > 0 && rope.ropeLength < 1);
  assert.ok(rope.rappellers.every((trooper) => trooper.opacity === 0));
  const descending = fleetMission(2, 0.8);
  assert.equal(descending.ropeLength, 1);
  assert.equal(descending.aircraftOpacity, 1);
  assert.ok(descending.rappellers[0].descent > descending.rappellers[1].descent);
  assert.ok(descending.rappellers[1].descent > descending.rappellers[2].descent);
  assert.ok(fleetMission(2, 0.92).rappellers.every((trooper) => trooper.descent === 1));
  assert.equal(fleetMission(2, 1).ropeOpacity, 0);
});

test('muzzle flash occurs only when the jet fires, never in patrol or after impact', () => {
  assert.equal(fleetMission(1, 0.4).muzzleOpacity, 0);
  assert.ok(fleetMission(1, 0.53).muzzleOpacity > 0);
  assert.equal(fleetMission(1, 0.53).projectileOpacity, 1);
  assert.equal(fleetMission(1, 0.8).muzzleOpacity, 0);
});

test('all outcome states are bounded and obey causality across the whole scroll', () => {
  for (let index = 0; index < 3; index++) {
    const forward = [];
    for (let i = 0; i <= 1000; i++) {
      const state = fleetMission(index, i / 1000);
      forward.push(state);
      Object.entries(state).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'phase') assert.ok(value >= 0 && value <= 1, key);
      });
      if (state.goldOpacity > 0 || state.troopsOpacity > 0) assert.equal(state.flight, 1);
      if (state.troopsOpacity > 0) assert.equal(state.aircraftOpacity, 0);
      if (state.projectileOpacity > 0) assert.equal(state.flight, 1);
      if (index === 1 && state.targetOpacity < 1) assert.equal(state.projectile, 1);
      state.rappellers.forEach((trooper) => {
        assert.ok(trooper.descent >= 0 && trooper.descent <= 1);
        if (trooper.opacity > 0 && trooper.descent < 1) {
          assert.equal(state.ropeLength, 1);
          assert.equal(state.aircraftOpacity, 1);
        }
      });
    }
    for (let i = 1000; i >= 0; i--) assert.deepEqual(fleetMission(index, i / 1000), forward[i]);
  }
});
