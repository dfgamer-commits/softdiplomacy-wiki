import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationModel } from '../app/operationWorld.ts';
import { categoryState } from '../app/categoryMotion.ts';
import { applyOperationTiming } from '../app/operationTiming.ts';

const blank = { flight: 0, prepare: 0, interact: 0, outcome: 0, shot: 0, shotVisible: false, impact: 0, targetVisible: true, engaging: false, rope: 0, descent: [0, 0, 0], advance: 0, carrierOpacity: 1 };
function at(kind, p) {
  const s = categoryState(p);
  return applyOperationTiming(kind, { ...blank, prepare: s.prepare, flight: s.action, interact: s.interaction, outcome: s.outcome }, p, false);
}

test('trade cannot pay early and credits both owners after arrival', () => {
  const model = buildOperationModel('trade', true);
  for (let i = 0; i <= 100; i++) {
    const s = at('trade', i / 100); model.setState(s);
    if (s.flight < 1) assert.equal(s.outcome, 0);
    assert.equal(model.coins.filter(c => c.visible).length, model.partnerCoins.filter(c => c.visible).length);
    if (s.outcome > 0) assert.equal(s.carrierOpacity, 0);
  }
  model.setState(at('trade', 0)); assert.ok(model.coins.every(c => !c.visible));
  model.dispose();
});

test('track connects before a train can appear or travel', () => {
  const model = buildOperationModel('rail', false);
  for (let i = 0; i <= 100; i++) {
    const s = at('rail', i / 100); model.setState(s);
    if (s.connection < 1) { assert.equal(s.flight, 0); assert.ok(model.train.every(c => !c.visible)); }
    if (s.flight > 0) assert.equal(s.connection, 1);
    model.couplers.forEach(line => {
      const buffer = line.geometry.attributes.position;
      assert.ok([...buffer.array].every(Number.isFinite));
    });
  }
  model.dispose();
});

test('airport payout comparison appears only after train arrival and shows eight of ten units', () => {
  const model = buildOperationModel('rail', true);
  model.setState(at('rail', 0.4)); assert.ok(model.airportPayout.every(b => !b.visible));
  model.setState(at('rail', 1)); assert.equal(model.airportPayout.filter(b => b.visible && !b.material.wireframe).length, 8);
  assert.equal(model.airportPayout.filter(b => b.visible && b.material.wireframe).length, 2);
  model.dispose();
});

test('committed troop groups leave the reserve and disappear from payload as they deploy', () => {
  const model = buildOperationModel('landing', true);
  model.setState(blank); assert.equal(model.reserve.filter(t => t.visible).length, 8);
  model.setState({ ...blank, prepare: 1 });
  assert.equal(model.reserve.filter(t => t.visible).length, 5);
  assert.equal(model.payload.filter(t => t.visible).length, 3);
  model.setState({ ...blank, prepare: 1, flight: 1, descent: [1, 0.5, 0], rope: 1 });
  assert.equal(model.payload.filter(t => t.visible).length, 1);
  assert.equal(model.troops.filter(t => t.visible).length, 2);
  model.setState(blank); assert.equal(model.reserve.filter(t => t.visible).length, 8);
  model.dispose();
});

test('targeting boundary follows the unit, shell follows the target, then patrol resumes', () => {
  const model = buildOperationModel('intercept', true);
  model.setState({ ...blank, flight: 1, engaging: true, shotVisible: true, shot: 1 });
  assert.ok(model.shell.position.distanceTo(model.enemy.position) < 1e-8);
  assert.ok(model.radius.position.distanceTo(model.moving.position) < 1e-8);
  model.setState({ ...blank, flight: 1, targetVisible: false, outcome: 0.5 });
  assert.equal(model.patrol.visible, true);
  assert.ok(model.moving.position.distanceTo(model.curve.getPointAt(1)) > 1);
  assert.ok(model.radius.position.distanceTo(model.moving.position) < 1e-8);
  model.dispose();
});

test('construction produces capacity only after the building exists', () => {
  const model = buildOperationModel('construction', false);
  model.setState(at('construction', 0)); const before = model.capacity.filter(b => b.visible).length;
  model.setState(at('construction', 0.65)); assert.equal(model.capacity.filter(b => b.visible).length, before);
  model.setState(at('construction', 1)); assert.ok(model.capacity.filter(b => b.visible).length > before);
  model.dispose();
});

test('all scenes have meaningful, finite inspection anchors and rewind deterministically', () => {
  for (const kind of ['trade', 'landing', 'intercept', 'rail', 'territory', 'construction', 'economy', 'network']) {
    const model = buildOperationModel(kind, true);
    model.setState(at(kind, 0)); const initial = model.anchors.map(a => ({ label: a.label, position: a.position.toArray() }));
    model.setState(at(kind, 1));
    model.anchors.forEach(a => { assert.ok(a.label.length > 3); assert.ok(a.position.toArray().every(Number.isFinite)); });
    model.focus(1); model.focus(null); model.setState(at(kind, 0));
    assert.deepEqual(model.anchors.map(a => ({ label: a.label, position: a.position.toArray() })), initial);
    model.dispose();
  }
});
