import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildOperationModel } from '../app/operationWorld.ts';

const initial = { flight: 0, prepare: 0, interact: 0, outcome: 0, shot: 0, shotVisible: false, impact: 0, targetVisible: true, engaging: false, rope: 0, descent: [0, 0, 0], advance: 0, carrierOpacity: 1 };

test('every 3D topic builds finite geometry and releases its scene', () => {
  for (const kind of ['trade', 'intercept', 'landing', 'rail', 'territory', 'construction', 'economy', 'network']) {
    const model = buildOperationModel(kind, true);
    for (const progress of [0, 0.25, 0.6, 1]) {
      model.setState({ ...initial, flight: progress, prepare: progress, interact: progress, outcome: progress, impact: progress });
      model.scene.updateMatrixWorld(true);
      model.scene.traverse((object) => assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${kind}: ${object.type}`));
    }
    model.dispose();
    assert.equal(model.scene.children.length, 0);
  }
});

test('3D flight markers and illuminated route use the same arc-length positions', () => {
  const model = buildOperationModel('trade', true);
  for (let frame = 0; frame <= 100; frame++) {
    const flight = frame / 100;
    model.setState({ ...initial, flight });
    const expected = model.curve.getPointAt(flight);
    assert.ok(model.moving.position.distanceTo(expected) < 1e-8);
    const route = model.trail.geometry.attributes.position;
    assert.ok(Math.hypot(route.getX(frame) - expected.x, route.getY(frame) - expected.y, route.getZ(frame) - expected.z) < 1e-5);
  }
  model.dispose();
});

test('water-unit routes stay on the water instead of following elevated air lanes', () => {
  for (const kind of ['trade', 'intercept', 'landing']) {
    const model = buildOperationModel(kind, false);
    for (let frame = 0; frame <= 20; frame++) assert.ok(Math.abs(model.curve.getPointAt(frame / 20).y - 0.25) < 1e-8);
    model.dispose();
  }
});

test('each of the three train carriages follows its own track position and tangent', () => {
  const model = buildOperationModel('rail', false);
  for (let frame = 0; frame <= 100; frame++) {
    const flight = frame / 100; model.setState({ ...initial, flight });
    model.train.forEach((car, index) => {
      const distance = 0.1 + flight * 0.82 - index * 0.035;
      assert.ok(car.position.distanceTo(model.railCurve.getPointAt(distance)) < 1e-8);
      const tangent = model.railCurve.getTangentAt(distance);
      assert.ok(Math.abs(car.rotation.y - Math.atan2(tangent.x, tangent.z)) < 1e-8);
    });
  }
  model.dispose();
});

test('combat does not collide: shell starts beyond the nose and target disappears after impact', () => {
  const model = buildOperationModel('intercept', true);
  model.setState({ ...initial, flight: 1, engaging: true, shotVisible: true, shot: 0 });
  assert.ok(model.shell.position.x > model.moving.position.x);
  assert.ok(model.shell.visible && model.enemy.visible);
  model.setState({ ...initial, flight: 1, impact: 1, targetVisible: false });
  assert.equal(model.enemy.visible, false);
  assert.equal(model.shell.visible, false);
  model.setState(initial);
  assert.equal(model.enemy.visible, true);
  model.dispose();
});

test('helicopter payload descends only when provided by the established timeline', () => {
  const model = buildOperationModel('landing', true);
  model.setState(initial); assert.ok(model.troops.every((troop) => !troop.visible));
  model.setState({ ...initial, flight: 1, rope: 1, descent: [0.8, 0.5, 0.2] });
  assert.ok(model.troops[0].position.y < model.troops[1].position.y);
  assert.ok(model.troops[1].position.y < model.troops[2].position.y);
  model.setState({ ...initial, flight: 1, descent: [1, 1, 1], advance: 1, carrierOpacity: 0 });
  assert.equal(model.moving.visible, false);
  assert.ok(model.troops.every((troop) => troop.visible && Math.abs(troop.position.y - 0.3) < 1e-8));
  model.dispose();
});

test('3D loading remains lazy with a retained accessible fallback and cleanup', async () => {
  const viewport = await readFile(new URL('../app/OperationsViewport.tsx', import.meta.url), 'utf8');
  const engine = await readFile(new URL('../app/operationWorld.ts', import.meta.url), 'utf8');
  assert.ok(viewport.includes("import('./operationWorld')"));
  assert.ok(viewport.includes('hidden={ready}'));
  assert.ok(viewport.includes('aria-label="Scene camera"'));
  assert.ok(viewport.includes('sceneRef.current?.dispose()'));
  assert.ok(engine.includes('webglcontextlost'));
  assert.ok(engine.includes('controls.enableZoom = false'));
  assert.ok(engine.includes('visible && !document.hidden'));
});
