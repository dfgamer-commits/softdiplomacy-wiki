import assert from 'node:assert/strict';
import test from 'node:test';
import { FLEET_CHAPTER_STOPS, fleetMotion, fleetScrollProgress } from '../app/airFleetMotion.ts';

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
