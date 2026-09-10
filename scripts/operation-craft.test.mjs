import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCraftKit, coastlineGeometry, waterMaterial } from '../app/operationCraft.ts';
import { buildOperationModel } from '../app/operationWorld.ts';
import { cameraBlendFactor, scenePixelRatio } from '../app/immersiveCamera.ts';

const blank = { flight: 0, prepare: 1, interact: 0, outcome: 0, shot: 0, shotVisible: false, impact: 0, targetVisible: true, engaging: false, rope: 0, descent: [0, 0, 0], advance: 0, carrierOpacity: 1, connection: 1 };

test('air markers retain separate beveled silhouettes and independent ownership materials', () => {
  const kit = createCraftKit(), triangle = kit.unit(3, 0x79e9f2, 'Passenger plane'), pentagon = kit.unit(5, 0x79e9f2, 'Fighter jet');
  assert.equal(triangle.children[0].geometry.type, 'ExtrudeGeometry');
  assert.equal(triangle.children[0].geometry.parameters.options.bevelEnabled, true);
  assert.notEqual(triangle.children[0].geometry, pentagon.children[0].geometry);
  assert.ok(pentagon.getObjectByName('forward weapon mount'));
  assert.ok(triangle.getObjectByName('inset silhouette'));
  pentagon.children[0].material.color.setHex(0xff0000);
  assert.equal(triangle.children[0].material.color.getHex(), 0x79e9f2);
});

test('endpoint details distinguish air, port, factory and symbolic income', () => {
  const kit = createCraftKit();
  for (const [air, label, expected] of [[true, 'Origin airport', 'control room'], [false, 'Origin port', 'dock crane boom'], [true, 'Factory', 'factory exhaust stack']]) {
    const group = new THREE.Group(); kit.station(group, air, label, 0x79e9f2); assert.ok(group.getObjectByName(expected));
  }
  const income = new THREE.Group(); kit.station(income, false, 'Base income', 0x79e9f2);
  assert.equal(income.getObjectByName('dock crane boom'), undefined, 'base income must not imply that it needs a port');
});

test('coastline geometry has flat endpoint land and lower, finite coastal shelves', () => {
  const geometry = coastlineGeometry(0, 0, 2.4, 2.8, 1);
  const vertices = geometry.attributes.position, normals = geometry.attributes.normal;
  assert.ok([...vertices.array, ...normals.array].every(Number.isFinite));
  const heights = Array.from({ length: vertices.count }, (_, i) => vertices.getY(i));
  assert.ok(Math.max(...heights) > -0.06); assert.ok(Math.min(...heights) < -0.3);
  geometry.dispose();
});

test('naval routes do not cross the raised land; airport endpoints sit on land', () => {
  for (const air of [false, true]) {
    const model = buildOperationModel('trade', air); model.setState(blank); model.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (let i = 0; i <= 100; i++) {
      if (air && i !== 0 && i !== 100) continue;
      const p = model.curve.getPointAt(i / 100); ray.set(new THREE.Vector3(p.x, 5, p.z), new THREE.Vector3(0, -1, 0));
      const hits = ray.intersectObjects(model.shores.children);
      const raised = hits.some(hit => hit.point.y > model.waterPlane.position.y);
      assert.equal(raised, air, `${air ? 'air' : 'sea'} route at ${i}%`);
    }
    model.dispose();
  }
});

test('train wheels roll by travelled distance, stop when scrubbed back, and steel grows with track', () => {
  const model = buildOperationModel('rail', false);
  model.setState({ ...blank, connection: 0.4 });
  model.railSteel.forEach(rail => assert.equal(rail.geometry.drawRange.count, Math.floor(0.4 * 159) * 30));
  model.setState({ ...blank, flight: 0.5 });
  model.trainAxles.flat().forEach(axle => assert.ok(Math.abs(axle.rotation.x - 0.5 * 0.82 * model.railCurve.getLength() / 0.074) < 1e-8));
  model.setState(blank); model.trainAxles.flat().forEach(axle => assert.equal(axle.rotation.x, 0));
  model.dispose();
});

test('rope grip changes to walking only after deployment, and rewind restores it', () => {
  const model = buildOperationModel('landing', true);
  model.setState({ ...blank, flight: 1, rope: 1, descent: [0.5, 0.3, 0.1] });
  assert.ok(Math.abs(model.troops[0].getObjectByName('rope grip arm').rotation.z) > 2);
  model.setState({ ...blank, flight: 1, rope: 1, descent: [1, 1, 1], advance: 0.6 });
  assert.ok(Math.abs(model.troops[0].getObjectByName('rope grip arm').rotation.z) < 0.3);
  assert.notEqual(model.troops[0].getObjectByName('walking leg').rotation.x, 0);
  model.setState(blank); assert.ok(model.troops.every(troop => !troop.visible)); model.dispose();
});

test('surface shader is deterministic, progress driven, and modifies only shading', () => {
  const water = waterMaterial();
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <normal_fragment_maps>' };
  water.material.onBeforeCompile(shader, undefined);
  assert.equal(shader.uniforms.uStoryPhase, water.phase);
  assert.ok(shader.vertexShader.includes('vWaterPosition = position'));
  assert.ok(shader.fragmentShader.includes('mat3(viewMatrix)'));
  water.phase.value = 3; assert.equal(shader.uniforms.uStoryPhase.value, 3);
  water.material.dispose();
});

test('camera settling is frame-rate independent and rendering has a bounded pixel budget', () => {
  const twice = 1 - (1 - cameraBlendFactor(16)) ** 2;
  assert.ok(Math.abs(twice - cameraBlendFactor(32)) < 1e-10);
  assert.equal(cameraBlendFactor(-3), 0); assert.equal(cameraBlendFactor(NaN), 0);
  for (const [w, h] of [[800, 500], [1920, 1080], [2560, 1440]]) {
    const ratio = scenePixelRatio(w, h, 3); assert.ok(ratio <= 2); assert.ok(w * h * ratio ** 2 <= 2_800_001);
  }
});

test('rich scenes remain within a bounded visible draw-object budget', () => {
  for (const kind of ['trade', 'intercept', 'landing', 'rail', 'territory', 'construction', 'economy', 'network']) {
    const model = buildOperationModel(kind, true); model.setState({ ...blank, flight: 0.5, interact: 0.5 });
    let draws = 0; model.scene.traverseVisible(object => { if (object.isMesh || object.isLine) draws++; });
    assert.ok(draws < 300, `${kind} has ${draws} visible drawing objects`);
    model.dispose();
  }
});
