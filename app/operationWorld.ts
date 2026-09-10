import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cameraBlendFactor, immersivePose, scenePixelRatio } from './immersiveCamera.ts';
import { coastlineGeometry, createCraftKit, waterMaterial } from './operationCraft.ts';

export type WorldKind = 'trade' | 'intercept' | 'landing' | 'rail' | 'territory' | 'construction' | 'economy' | 'network';
export type WorldState = { flight: number; prepare: number; interact: number; outcome: number; shot: number; shotVisible: boolean; impact: number; targetVisible: boolean; engaging: boolean; rope: number; descent: number[]; advance: number; carrierOpacity: number; connection?: number; timeline?: number; enemyApproach?: number };
export type CameraMode = 'ride' | 'cinematic' | 'orbit' | 'top';
const cyan = 0x79e9f2, amber = 0xffcd7e, red = 0xff7f70;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (n: number) => Math.min(1, Math.max(0, n));

// Build the scene separately from WebGL so geometry, routing, and lifecycle can
// be regression-tested without a browser or a graphics device.
export function buildOperationModel(kind: WorldKind, air: boolean) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071019);
  scene.fog = new THREE.Fog(0x071019, 25, 65);
  scene.add(new THREE.HemisphereLight(0xc0def4, 0x182632, 1.4));
  const sun = new THREE.DirectionalLight(0xffead5, 3.4);
  sun.position.set(-5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 35;
  sun.shadow.normalBias = 0.018; sun.shadow.bias = -0.0001; sun.shadow.radius = 3; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x7fcbe9, 1.5); fill.position.set(4, 5, -7); scene.add(fill);
  const craft = createCraftKit();
  const root = new THREE.Group(); scene.add(root);
  const environment = new THREE.Group(); scene.add(environment); environment.visible = false;
  const horizon = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x112b32, roughness: 1 })); horizon.rotation.x = -Math.PI / 2; horizon.position.y = -0.52; horizon.receiveShadow = true; environment.add(horizon);
  const farGrid = new THREE.GridHelper(100, 100, 0x2b505c, 0x193943); farGrid.position.y = -0.5; environment.add(farGrid);
  const surface = new THREE.MeshStandardMaterial({ color: 0x203a42, roughness: 0.88, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.42, 11), surface); floor.position.y = -0.28; floor.receiveShadow = true; root.add(floor);
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(floor.geometry), new THREE.LineBasicMaterial({ color: 0x527788 })); rim.position.copy(floor.position); root.add(rim);
  // Tile grid is a spatial reference, not a radar or a gameplay range.
  const grid = new THREE.GridHelper(18, 18, 0x385662, 0x203b48); grid.position.y = -0.045; grid.scale.z = 0.6; root.add(grid);
  grid.visible = !['trade', 'intercept', 'landing'].includes(kind);
  const mapMaterial = new THREE.MeshStandardMaterial({ color: 0x407381, transparent: true, opacity: 0.6, roughness: 1, depthWrite: false });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(17.8, 10.8), mapMaterial); map.rotation.x = -Math.PI / 2; map.position.y = -0.052; map.receiveShadow = true; root.add(map);
  const content = new THREE.Group(); root.add(content);
  const objects: THREE.Object3D[] = [];
  function mesh(geometry: THREE.BufferGeometry, color: number, parent: THREE.Object3D = content, glow = 0) {
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: 0.32, metalness: 0.48 });
    const result = new THREE.Mesh(geometry, material); result.castShadow = true; result.receiveShadow = true; parent.add(result); return result;
  }
  function ring(radius: number, color: number, parent: THREE.Object3D = content) {
    const result = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.017, 6, 72), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
    result.rotation.x = Math.PI / 2; parent.add(result); return result;
  }
  function station(x: number, z: number, label: string, color = cyan) {
    const group = new THREE.Group(); group.position.set(x, 0.08, z); content.add(group);
    craft.station(group, air, label, color); group.userData.label = label; objects.push(group); return group;
  }
  function unit(sides: number, color: number, label: string) {
    const group = craft.unit(sides, color, label); group.userData.label = label; content.add(group); objects.push(group);
    return group;
  }
  const height = air ? 1.8 : 0.25;
  const end = kind === 'intercept' ? v(-0.6, height, 0) : v(6, kind === 'landing' ? height : air ? 0.42 : height, 1.5);
  const curve = new THREE.CubicBezierCurve3(v(-6, air ? 0.48 : 0.25, 2), v(-3.7, air ? height + 0.5 : height, -3.5), v(2, air ? height + 0.6 : height, -3.8), end);
  const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(100)), new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.2 })); content.add(guide);
  const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(100)), new THREE.LineBasicMaterial({ color: cyan })); content.add(trail);
  const routeTube = craft.add(content, new THREE.TubeGeometry(curve, 100, 0.014, 6, false), craft.material(kind === 'landing' ? amber : cyan, 0.25, 0.4, 0.5), 'completed route'); routeTube.visible = ['trade', 'intercept', 'landing'].includes(kind); routeTube.castShadow = false;
  const motes = Array.from({ length: 16 }, (_, i) => mesh(new THREE.SphereGeometry(0.04 + (16 - i) * 0.001, 6, 4), cyan, content, 0.9));
  const moving = unit(air ? kind === 'intercept' ? 5 : 3 : 24, kind === 'landing' ? amber : cyan, air ? kind === 'intercept' ? 'Fighter jet' : kind === 'landing' ? 'Attack helicopter' : 'Passenger plane' : kind === 'intercept' ? 'Warship' : kind === 'landing' ? 'Transport ship' : 'Trade ship');
  const departure = station(-6, 2, kind === 'economy' ? 'Base income' : kind === 'rail' ? 'Factory' : kind === 'landing' && !air ? 'Owned coast' : air ? 'Origin airport' : 'Origin port');
  const destination = station(end.x, end.z, kind === 'economy' ? 'Construction' : kind === 'rail' ? air ? 'Airport station' : 'Port station' : air ? 'Destination airport' : 'Destination port');
  const enemy = unit(air ? 3 : 24, red, air ? 'Enemy helicopter' : 'Enemy transport');
  const enemyPosition = v(3.5, height, 0); enemy.position.copy(enemyPosition);
  const radius = ring(4.2, cyan); radius.position.copy(v(-0.6, height, 0));
  const lock = new THREE.Group(); content.add(lock); lock.position.copy(enemyPosition);
  for (let i = 0; i < 4; i++) { const bar = mesh(new THREE.BoxGeometry(0.3, 0.025, 0.045), amber, lock, 0.8); bar.position.set(Math.sin(i * Math.PI / 2) * 0.65, 0, Math.cos(i * Math.PI / 2) * 0.65); bar.rotation.y = i * Math.PI / 2; }
  const shell = mesh(new THREE.CapsuleGeometry(0.055, 0.2, 4, 8), 0xffe3ac, content, 2); shell.rotation.z = Math.PI / 2;
  const shellStreak = craft.add(shell, new THREE.ConeGeometry(0.055, 0.55, 8), new THREE.MeshBasicMaterial({ color: 0xffd99b, transparent: true, opacity: 0.45, depthWrite: false }), 'projectile motion trace', v(0, -0.38, 0)); shellStreak.rotation.z = Math.PI; shellStreak.castShadow = false;
  const flash = new THREE.PointLight(amber, 0, 7); content.add(flash);
  const burst = Array.from({ length: 8 }, () => mesh(new THREE.TetrahedronGeometry(0.07), amber, content, 0.6));
  const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([end, end]), new THREE.LineBasicMaterial({ color: 0xffeac7 })); content.add(rope);
  const ropeCable = craft.add(content, new THREE.CylinderGeometry(0.013, 0.013, 1, 8), craft.material(0xd3c4a4, 0.15, 0.9), 'deployed rope cable');
  const troops = [0, 1, 2].map(() => mesh(new THREE.CapsuleGeometry(0.075, 0.16, 3, 6), amber));
  const troopRig = troops.map(troop => craft.trooper(troop, amber));
  const landing = mesh(new THREE.BoxGeometry(1.6, 0.07, 1.6), 0x4c644e); landing.position.copy(v(end.x, 0.03, end.z));
  const railCurve = new THREE.CatmullRomCurve3([v(-7, 0.13, 2), v(-4, 0.13, 2), v(-2, 0.13, -1.8), v(1.5, 0.13, -1.8), v(4, 0.13, 1.5), v(7, 0.13, 1.5)]);
  const railGroup = new THREE.Group(); content.add(railGroup);
  const railSteel: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 160 }, (_, i) => { const t = i / 159, p = railCurve.getPointAt(t), tangent = railCurve.getTangentAt(t); return p.add(v(-tangent.z, 0, tangent.x).multiplyScalar(side * 0.18)); });
    railGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xc6d7db })));
    const rail = craft.add(railGroup, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => p.clone().add(v(0, 0.043, 0)))), 159, 0.021, 5, false), craft.material(0x99aeb8, 0.85, 0.26), 'continuous steel rail'); railSteel.push(rail);
  }
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.065, 0.07), new THREE.MeshStandardMaterial({ color: 0x426574 }), 90); railGroup.add(ties);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 90; i++) { const t = i / 89, tangent = railCurve.getTangentAt(t); dummy.position.copy(railCurve.getPointAt(t)); dummy.rotation.y = Math.atan2(tangent.x, tangent.z); dummy.updateMatrix(); ties.setMatrixAt(i, dummy.matrix); }
  const trainAxles: THREE.Group[][] = [];
  const train = [0, 1, 2].map((i) => {
    const car = new THREE.Group(); railGroup.add(car);
    trainAxles.push(craft.carriage(car, i === 0));
    return car;
  });
  const couplers = [0, 1].map(() => { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xc0d6de })); railGroup.add(line); return line; });
  const columns = [0, 1, 2].map((i) => { const c = mesh(craft.rounded(0.9, 1, 1.2), 0x688894); c.position.x = (i - 1) * 1.2; craft.city(c, 0.9, 1.8 + (i === 1 ? 1.2 : i * 0.25), 1.2); return c; });
  const blueprint = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.2, 3.2, 2)), new THREE.LineBasicMaterial({ color: 0x6cced8, transparent: true, opacity: 0.35 })); blueprint.position.y = 1.6; content.add(blueprint);
  const tiles = Array.from({ length: 45 }, (_, i) => { const tile = mesh(new THREE.BoxGeometry(0.85, 0.12, 0.85), i % 9 < 4 ? 0x397584 : 0x4d3a48); tile.position.set((i % 9 - 4) * 0.92, 0.09, (Math.floor(i / 9) - 2) * 0.92); return tile; });
  const coins = Array.from({ length: 12 }, () => mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), amber, content, 0.2));
  const partnerCoins = Array.from({ length: 12 }, () => mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), amber, content, 0.2));
  const network = [0, 1, 2].map((i) => ({ unit: unit(i === 1 ? 5 : 3, i === 2 ? amber : cyan, ['Passenger plane', 'Fighter jet', 'Attack helicopter'][i]), curve: new THREE.CubicBezierCurve3(v(-5, 0.5, 0), v(-2, 2, 0), v(2, 2.3, (i - 1) * 3), v(6, 0.7, (i - 1) * 3)) }));
  const networkGuides = network.map(({ curve: route }, i) => { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getSpacedPoints(80)), new THREE.LineBasicMaterial({ color: i === 2 ? amber : cyan, transparent: true, opacity: 0.4 })); content.add(line); return line; });
  // Keep each topic's scene distinct; unused mesh families never appear.
  const routeScene = ['trade', 'intercept', 'landing'].includes(kind);
  guide.visible = trail.visible = moving.visible = routeScene;
  departure.visible = destination.visible = routeScene || kind === 'rail' || kind === 'network';
  if (kind === 'network') departure.position.set(-5, 0.08, 0);
  enemy.visible = radius.visible = lock.visible = shell.visible = kind === 'intercept';
  rope.visible = landing.visible = kind === 'landing';
  railGroup.visible = kind === 'rail'; blueprint.visible = kind === 'construction';
  columns.forEach((c) => { c.visible = kind === 'construction'; });
  tiles.forEach((c) => { c.visible = kind === 'territory'; });
  network.forEach((item) => { item.unit.visible = kind === 'network'; });
  networkGuides.forEach((item) => { item.visible = kind === 'network'; });
  destination.visible = kind === 'trade' || kind === 'rail';
  if (kind === 'economy') { departure.visible = destination.visible = true; departure.position.set(-5, 0.08, 0); destination.position.set(5, 0.08, 0); }
  // Local schematic terrain replaces a decorative world texture: ships cross a
  // water corridor; airports sit on land. Geographic coordinates are not implied.
  map.visible = false;
  const shores = new THREE.Group(); content.add(shores);
  const water = waterMaterial();
  const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(17.9, 10.9).rotateX(-Math.PI / 2), water.material); waterPlane.name = 'water corridor'; waterPlane.position.y = -0.06; waterPlane.receiveShadow = true; waterPlane.visible = routeScene; content.add(waterPlane);
  if (routeScene) {
    for (const [index, point] of [v(-6.5, 0, 2.5), v(6.3, 0, 2.4)].entries()) {
      const shore = new THREE.Mesh(coastlineGeometry(point.x, air ? point.z : 4.6, 2.4, air ? 2.8 : 1.6, index * 1.4), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.05 })); shore.name = 'contoured coastal shelf'; shore.receiveShadow = true; shore.castShadow = true; shores.add(shore);
    }
    surface.color.setHex(0x143747);
  }
  const anchors = [0, 1, 2].map((id) => ({ id, label: '', position: v(0, 0, 0), visible: true }));
  if (!air && routeScene) {
    for (const point of [v(-6, 0.04, 2.6), v(6, 0.04, 2.25)]) {
      const pier = mesh(craft.rounded(0.9, 0.16, 2.5), 0x53676b); pier.position.copy(point);
      craft.instances(content, 'pier deck boards', new THREE.BoxGeometry(0.86, 0.012, 0.022), craft.material(0x92a4a3, 0.1, 0.9), Array.from({ length: 18 }, (_, i) => ({ position: point.clone().add(v(0, 0.088, -1.16 + i * 0.135)) })));
      craft.instances(content, 'mooring bollards', new THREE.CylinderGeometry(0.037, 0.05, 0.1, 8), craft.material(0x172b36), [-1, 1].flatMap(side => [-0.8, 0, 0.8].map(z => ({ position: point.clone().add(v(side * 0.4, 0.1, z)) }))));
    }
  }
  const selection = ring(0.72, 0xf6f5d9); selection.visible = false;
  let selected: number | null = null;
  function focus(id: number | null) { selected = id; selection.visible = id !== null; if (id !== null) selection.position.copy(anchors[id].position).add(v(0, -0.5, 0)); }
  const ledger = new THREE.Group(); content.add(ledger); ledger.visible = ['trade', 'economy', 'construction'].includes(kind);
  const moneyPaths = [0, 1].map(() => { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]), new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0.6 })); ledger.add(line); return line; });
  const reserve = Array.from({ length: 8 }, () => mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 6), cyan));
  reserve.forEach(troop => craft.trooper(troop, cyan));
  const payload = [0, 1, 2].map(() => mesh(new THREE.CapsuleGeometry(0.075, 0.17, 3, 6), amber));
  const troopsInCombat = [0, 1, 2].map(() => mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 6), amber));
  const combatRig = troopsInCombat.map(troop => craft.trooper(troop, amber));
  const front = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, -2.4), v(0, 0, 2.4)]), new THREE.LineBasicMaterial({ color: red })); content.add(front); front.visible = kind === 'territory';
  const defense = mesh(new THREE.BoxGeometry(0.55, 0.45, 0.6), 0x936c65); defense.position.set(0.9, 0.32, 0.9); defense.visible = kind === 'territory';
  const capacity = Array.from({ length: 10 }, (_, i) => { const block = mesh(new THREE.BoxGeometry(0.25, 0.15, 0.25), cyan); block.position.set(3 + i % 5 * 0.36, 0.17, -0.7 + Math.floor(i / 5) * 0.4); return block; });
  const extensionCurve = new THREE.CatmullRomCurve3([railCurve.getPointAt(0.6), v(2.5, 0.13, -3.5), v(5, 0.13, -3.5), railCurve.getPointAt(0.85)]);
  const extension = new THREE.Line(new THREE.BufferGeometry().setFromPoints(extensionCurve.getSpacedPoints(80)), new THREE.LineBasicMaterial({ color: 0xa8bcc2 })); content.add(extension); extension.visible = kind === 'rail' && !air;
  const navalTwins = [0, 1, 2].map((i) => { const twin = unit(24, 0x567a8a, ['Trade ship', 'Warship', 'Transport ship'][i]); twin.position.set(-6.5, 0.25, (i - 1) * 3); twin.visible = kind === 'network'; return twin; });
  const twinLinks = navalTwins.map((twin, i) => { const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([twin.position, v(-5, 0.25, (i - 1) * 1.5)]), new THREE.LineDashedMaterial({ color: 0x7893a0, dashSize: 0.1, gapSize: 0.1 })); link.computeLineDistances(); link.visible = kind === 'network'; content.add(link); return link; });
  const patrolPoints = Array.from({ length: 65 }, (_, i) => { const angle = i / 64 * Math.PI * 2; return end.clone().add(v(Math.sin(angle) * 1.25, 0, (1 - Math.cos(angle)) * 1.25)); });
  const patrol = new THREE.Line(new THREE.BufferGeometry().setFromPoints(patrolPoints), new THREE.LineDashedMaterial({ color: cyan, dashSize: 0.12, gapSize: 0.12, transparent: true, opacity: 0.5 })); patrol.computeLineDistances(); content.add(patrol); patrol.visible = false;
  const airportPayout = Array.from({ length: 10 }, (_, i) => { const bar = mesh(new THREE.BoxGeometry(0.16, 0.09, 0.3), i < 8 ? amber : 0x607781); bar.material.wireframe = i >= 8; bar.position.copy(railCurve.getPointAt(0.92)).add(v(-1 + i * 0.22, 0.1, 1.1)); return bar; });
  departure.userData.anchor = 0; destination.userData.anchor = 2; moving.userData.anchor = 1; enemy.userData.anchor = 2;
  train.forEach(car => { car.userData.label = 'Track-bound train'; car.userData.anchor = 1; objects.push(car); });
  columns.forEach(column => { column.userData.label = 'City construction'; column.userData.anchor = 1; objects.push(column); });
  network.forEach((item, i) => { item.unit.userData.anchor = i; });
  function segment(line: THREE.Line, start: THREE.Vector3, finish: THREE.Vector3) {
    const points = line.geometry.attributes.position as THREE.BufferAttribute; points.setXYZ(0, start.x, start.y, start.z); points.setXYZ(1, finish.x, finish.y, finish.z); points.needsUpdate = true; line.geometry.computeBoundingSphere();
  }
  function anchor(id: number, label: string, position: THREE.Vector3) { anchors[id].label = label; anchors[id].position.copy(position); }
  function setState(s: WorldState) {
    const flight = clamp(s.flight);
    water.phase.value = flight * 7 + s.outcome;
    moving.position.copy(curve.getPointAt(flight)); const tangent = curve.getTangentAt(flight); moving.rotation.y = Math.atan2(tangent.x, tangent.z);
    moving.rotation.x = air ? -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)) : 0;
    // Banking is determined by the curve, never a periodic sideways flick.
    const before = curve.getTangentAt(Math.max(0, flight - 0.012)), after = curve.getTangentAt(Math.min(1, flight + 0.012));
    moving.rotation.z = air && !s.engaging && !s.outcome ? Math.max(-0.12, Math.min(0.12, (before.x * after.z - before.z * after.x) * 1.8)) : 0;
    moving.visible = routeScene && s.carrierOpacity > 0.05;
    const hull = (moving.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;
    hull.color.setHex(s.engaging ? red : kind === 'landing' ? amber : cyan); hull.emissive.copy(hull.color);
    trail.geometry.setDrawRange(0, Math.max(0, Math.floor(flight * 100) + 1));
    routeTube.geometry.setDrawRange(0, Math.floor(flight * 100) * 36);
    motes.forEach((item, i) => { item.visible = routeScene && flight > 0 && s.carrierOpacity > 0.05; item.position.copy(curve.getPointAt(Math.max(0, flight - (i + 1) * 0.009))); });
    departure.scale.setScalar(0.65 + 0.35 * s.prepare);
    destination.scale.setScalar(0.65 + 0.35 * s.prepare);
    enemy.visible = kind === 'intercept' && s.targetVisible;
    const approach = s.enemyApproach ?? 1;
    enemy.position.copy(enemyPosition).add(v((1 - approach) * 3, 0, -(1 - approach) * 2));
    radius.visible = kind === 'intercept'; radius.position.copy(moving.position);
    lock.position.copy(enemy.position);
    if (kind === 'intercept' && s.engaging) moving.rotation.y = Math.atan2(enemy.position.x - moving.position.x, enemy.position.z - moving.position.z);
    lock.visible = kind === 'intercept' && s.engaging && s.targetVisible; lock.scale.setScalar(1.4 - s.interact * 0.4);
    shell.visible = kind === 'intercept' && s.shotVisible;
    const weapon = moving.getObjectByName('forward weapon mount'); if (weapon) weapon.position.z = 0.1 - (s.shotVisible ? (1 - s.shot) * 0.035 : 0);
    const muzzle = moving.position.clone().add(enemy.position.clone().sub(moving.position).normalize().multiplyScalar(0.45));
    shell.position.lerpVectors(muzzle, enemy.position, s.shot);
    shell.quaternion.setFromUnitVectors(v(0, 1, 0), enemy.position.clone().sub(muzzle).normalize());
    flash.position.copy(shell.position); flash.intensity = shell.visible ? 3 : 0;
    burst.forEach((item, i) => { item.visible = kind === 'intercept' && s.impact > 0 && s.impact < 1; const a = i * 2.399; item.position.copy(enemyPosition).add(v(Math.cos(a) * s.impact * 0.8, Math.sin(i * 1.8) * s.impact * 0.5, Math.sin(a) * s.impact * 0.8)); item.scale.setScalar(Math.max(0.01, 1 - s.impact)); });
    patrol.visible = kind === 'intercept' && s.outcome > 0;
    if (patrol.visible) { const angle = s.outcome * Math.PI * 2; moving.position.copy(end).add(v(Math.sin(angle) * 1.25, 0, (1 - Math.cos(angle)) * 1.25)); moving.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle)); radius.position.copy(moving.position); }
    rope.visible = kind === 'landing' && air && s.rope > 0 && s.carrierOpacity > 0.05;
    ropeCable.visible = rope.visible; const ropeLength = s.rope * (end.y - 0.25); ropeCable.scale.y = Math.max(0.001, ropeLength); ropeCable.position.copy(end).add(v(0, -ropeLength / 2, 0));
    const ropeArray = rope.geometry.attributes.position as THREE.BufferAttribute; ropeArray.setXYZ(0, end.x, end.y, end.z); ropeArray.setXYZ(1, end.x, end.y - s.rope * (end.y - 0.25), end.z); ropeArray.needsUpdate = true;
    troops.forEach((item, i) => { const d = s.descent[i] ?? 0; item.visible = kind === 'landing' && d > 0; item.position.set(end.x + (i - 1) * 0.23 * d + s.advance * 0.8, air ? end.y * (1 - d) + 0.3 * d : 0.3, end.z); troopRig[i].arms.forEach((arm, side) => { arm.rotation.z = (side ? 1 : -1) * (air && d > 0 && d < 1 ? 2.4 : 0.2); }); troopRig[i].legs.forEach((leg, side) => { leg.rotation.x = d >= 1 ? Math.sin(s.advance * 12 + side * Math.PI) * 0.35 : 0; }); });
    train.forEach((car, i) => { const t = 0.1 + flight * 0.82 - i * 0.035; car.position.copy(railCurve.getPointAt(t)); const direction = railCurve.getTangentAt(t); car.rotation.y = Math.atan2(direction.x, direction.z); trainAxles[i].forEach(axle => { axle.rotation.x = flight * 0.82 * railCurve.getLength() / 0.074; }); });
    const connection = s.connection ?? 1;
    if (kind === 'rail') {
      departure.position.copy(railCurve.getPointAt(0.1)); destination.position.copy(railCurve.getPointAt(0.92));
      railGroup.visible = connection > 0;
      railGroup.children.filter((child) => child instanceof THREE.Line && !couplers.includes(child)).forEach((line) => (line as THREE.Line).geometry.setDrawRange(0, Math.floor(connection * 160)));
      ties.count = Math.floor(connection * 90);
      railSteel.forEach(rail => rail.geometry.setDrawRange(0, Math.floor(connection * 159) * 30));
      train.forEach((car) => { car.visible = connection >= 1; });
      couplers.forEach((line, i) => { line.visible = connection >= 1; const a = train[i].position.clone().add(v(-Math.sin(train[i].rotation.y), 0, -Math.cos(train[i].rotation.y)).multiplyScalar(0.29)); const b = train[i + 1].position.clone().add(v(Math.sin(train[i + 1].rotation.y), 0, Math.cos(train[i + 1].rotation.y)).multiplyScalar(0.29)); a.y += 0.14; b.y += 0.14; segment(line, a, b); });
      extension.geometry.setDrawRange(0, Math.floor(s.outcome * 81));
    }
    airportPayout.forEach((bar) => { bar.visible = kind === 'rail' && air && flight >= 1 && s.outcome > 0; });
    columns.forEach((column, i) => { const h = Math.max(0.03, s.interact * (1.8 + (i === 1 ? 1.2 : i * 0.25))); column.scale.y = h; column.position.y = h / 2; }); blueprint.visible = kind === 'construction' && s.interact < 1;
    tiles.forEach((tile, i) => { tile.material.color.setHex(i % 9 < 4 + Math.floor(s.outcome * 3) ? 0x397584 : 0x4d3a48); tile.position.y = 0.09 + s.prepare * 0.04; });
    coins.forEach((coin, i) => {
      coin.visible = kind === 'economy' || kind === 'construction' || (kind === 'trade' && s.outcome > 0);
      if (kind === 'economy') coin.position.set(-4.5 + s.prepare * 4.5 + s.interact * 4.5, 0.2 + i * 0.07, 0);
      else if (kind === 'construction') { coin.position.set(-3 + s.interact * 3, 0.2 + i * 0.07, 0); coin.visible = s.interact < 1; }
      else coin.position.set(end.x + 1 + (i % 3 - 1) * 0.18, 0.2 + Math.floor(i / 3) * 0.08, end.z);
      const partner = partnerCoins[i]; partner.visible = (kind === 'trade' && s.outcome > 0) || (kind === 'economy' && s.flight >= 1);
      partner.position.set(kind === 'trade' ? -7.2 : -3.8, 0.2 + Math.floor(i / 3) * 0.08, kind === 'trade' ? 2 + (i % 3 - 1) * 0.18 : 2.4 + (i % 3 - 1) * 0.18);
    });
    // Reserve markers are grouping symbols, not literal troop counts. Committed
    // markers leave the reserve before boarding or entering the land attack.
    const commitment = kind === 'territory' ? s.flight : s.prepare;
    reserve.forEach((unit, i) => { unit.visible = (kind === 'landing' || kind === 'territory') && (i >= 3 || commitment === 0); unit.position.set(-6.8 + i % 4 * 0.28, 0.28, 3.3 + Math.floor(i / 4) * 0.3); });
    payload.forEach((unit, i) => { unit.visible = kind === 'landing' && s.prepare > 0 && s.carrierOpacity > 0.05 && (s.descent[i] ?? 0) === 0; unit.position.copy(v(-6.8 + i * 0.28, 0.28, 3.3)).lerp(moving.position.clone().add(v((i - 1) * 0.18, 0.24, 0)), s.prepare); });
    troopsInCombat.forEach((unit, i) => { unit.visible = kind === 'territory' && commitment > 0 && !(i === 0 && s.interact > 0.7); unit.position.set(-6.2 + s.flight * 5.2 + s.outcome * 2.5, 0.3, (i - 1) * 0.85); unit.rotation.y = Math.PI / 2; combatRig[i].legs.forEach((leg, side) => { leg.rotation.x = Math.sin((s.flight * 5.2 + s.outcome * 2.5) * 9 + side * Math.PI) * 0.4; }); });
    front.position.set(-0.5 + Math.floor(s.outcome * 3) * 0.92, 0.21, 0);
    capacity.forEach((block, i) => { block.visible = ['construction', 'economy'].includes(kind) && i < 4 + Math.floor(s.outcome * 6); });
    if (kind === 'economy') { columns.forEach((column, i) => { column.visible = s.interact > 0; column.position.x = 4.4 + i * 0.45; column.scale.x = 0.4; column.scale.z = 0.5; column.position.y = column.scale.y / 2; }); }
    moneyPaths.forEach((line, i) => { line.visible = kind === 'trade' && s.outcome > 0; segment(line, v(end.x, 0.22, end.z), i ? v(-7.2, 0.22, 2) : v(7, 0.22, end.z)); });
    network.forEach((item, i) => { const t = clamp(s.interact * 1.4 - i * 0.15); item.unit.visible = kind === 'network' && s.connection === 1; item.unit.position.copy(item.curve.getPointAt(t)); const direction = item.curve.getTangentAt(t); item.unit.rotation.y = Math.atan2(direction.x, direction.z); networkGuides[i].geometry.setDrawRange(0, Math.floor(t * 80) + 1); navalTwins[i].visible = twinLinks[i].visible = kind === 'network' && s.prepare > 0; });
    if (routeScene) {
      anchor(0, kind === 'landing' ? 'Troops committed' : air ? 'Origin airport' : 'Origin port', departure.position.clone().add(v(0, 0.5, 0)));
      anchor(1, kind === 'trade' ? s.outcome > 0 ? 'Trade completed' : 'No delivery payment yet' : kind === 'intercept' ? s.engaging ? 'In range · engaging' : 'Patrol' : s.advance > 0 ? 'Normal land combat' : s.rope > 0 ? 'Troop handoff' : 'Troops in transit', moving.position.clone().add(v(0, 0.7, 0)));
      anchor(2, kind === 'intercept' ? s.targetVisible ? 'Hostile troop carrier' : 'Threat removed' : kind === 'trade' ? s.outcome > 0 ? 'Both owners paid' : 'Partner destination' : 'Selected tile', kind === 'intercept' ? enemy.position.clone().add(v(0, 0.6, 0)) : end.clone().add(v(0, 0.8, 0)));
    } else if (kind === 'rail') {
      anchor(0, 'Factory', departure.position.clone().add(v(0, 0.5, 0)));
      anchor(1, connection < 1 ? 'Track connecting' : 'Track-bound train', train[0].position.clone().add(v(0, 0.8, 0)));
      anchor(2, air ? s.outcome > 0 ? 'Airport stop · 80% of port payout' : 'Airport station' : s.outcome > 0 ? 'Network extension' : 'Port station', destination.position.clone().add(v(0, 0.5, 0)));
    } else if (kind === 'territory') {
      anchor(0, 'Troop reserve', v(-6, 0.7, 3.4)); anchor(1, 'Committed attack', troopsInCombat[1].position.clone().add(v(0, 0.6, 0))); anchor(2, 'Territory boundary', front.position.clone().add(v(0, 0.6, 0)));
    } else if (kind === 'network') {
      network.forEach((item, i) => anchor(i, ['Trade · passenger plane', 'Patrol · fighter jet', 'Insertion · helicopter'][i], item.unit.position.clone().add(v(0, 0.65, 0))));
    } else {
      anchor(0, kind === 'economy' ? 'Gold reserve' : 'Construction cost', v(-3, 1, 0)); anchor(1, kind === 'economy' ? 'City purchase' : s.interact < 1 ? 'City placement' : 'City built', v(kind === 'economy' ? 4.5 : 0, 2.8, 0)); anchor(2, 'Population capacity', v(3.8, 0.6, -0.6));
    }
    selection.visible = selected !== null; if (selected !== null) selection.position.copy(anchors[selected].position).add(v(0, -0.5, 0));
  }
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse((item) => { const drawable = item as THREE.Mesh; if (drawable.geometry) geometries.add(drawable.geometry); if (drawable.material) (Array.isArray(drawable.material) ? drawable.material : [drawable.material]).forEach((m) => materials.add(m)); });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
    sun.shadow.map?.dispose(); scene.clear();
  }
  function viewpoint() {
    const subject = kind === 'rail' ? train[0] : kind === 'network' ? network[1].unit : ['trade', 'landing', 'intercept'].includes(kind) ? moving : troopsInCombat[1];
    return { subject: ['construction', 'economy'].includes(kind) ? v(0, 0.6, 0) : subject.position, heading: subject.rotation.y, attention: anchors[2].position };
  }
  return { scene, root, mapMaterial, setState, dispose, curve, railCurve, train, trainAxles, railSteel, moving, enemy, shell, troops, objects, trail, anchors, focus, coins, partnerCoins, reserve, payload, couplers, railGroup, capacity, radius, airportPayout, patrol, environment, viewpoint, waterPlane, shores };
}

export function createOperationWorld(host: HTMLElement, kind: WorldKind, air: boolean, onInspect: (label: string) => void, onFailure?: () => void, onSelect?: (anchor: number) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const model = buildOperationModel(kind, air);
  // A prefiltered light environment makes bevels, glass and metal legible;
  // it does not add a decorative background or a network-loaded texture.
  const studio = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(studio, 0.02); model.scene.environment = reflections.texture; model.scene.environmentIntensity = 0.65;
  studio.dispose(); pmrem.dispose();
  const labels = model.anchors.map(() => { const label = document.createElement('span'); label.className = 'operations-world-label'; host.appendChild(label); return label; });
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100); camera.position.set(9, 12, 15);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.enablePan = false; controls.enableZoom = false; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.35; controls.enabled = false;
  renderer.domElement.style.touchAction = 'pan-y';
  let mode: CameraMode = 'cinematic', zoom = 1, disposed = false, visible = true, progress = 0, contextLost = false, calm = false, lookX = 0, lookY = 0;
  let cameraFrame = 0, cameraTime = 0, cameraStarted = false, desiredFov = 42;
  const desiredPosition = camera.position.clone(), desiredTarget = controls.target.clone();
  const draw = () => { if (!disposed && !contextLost && visible && !document.hidden) {
    renderer.render(model.scene, camera);
    const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
    model.anchors.forEach((anchor, i) => {
      const point = anchor.position.clone().project(camera), label = labels[i];
      label.textContent = anchor.label;
      const width = label.offsetWidth, height = label.offsetHeight;
      const x = Math.max(width / 2 + 8, Math.min(host.clientWidth - width / 2 - 8, (point.x * 0.5 + 0.5) * host.clientWidth));
      let y = (0.5 - point.y * 0.5) * host.clientHeight;
      for (const box of boxes) if (Math.abs(x - box.x) < (width + box.width) / 2 + 5 && Math.abs(y - box.y) < (height + box.height) / 2 + 5) y = box.y + box.height + 8;
      label.hidden = point.z < -1 || point.z > 1 || Math.abs(point.x) > 0.95 || y < 55 || y > host.clientHeight - 130;
      label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if (!label.hidden) boxes.push({ x, y, width, height });
    });
  } };
  const loseContext = (event: Event) => { if (!disposed) { event.preventDefault(); contextLost = true; onFailure?.(); } };
  renderer.domElement.addEventListener('webglcontextlost', loseContext);
  controls.addEventListener('change', draw);
  const resize = () => { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); renderer.setPixelRatio(scenePixelRatio(w, h, window.devicePixelRatio)); renderer.setSize(w, h); camera.aspect = w / h; cameraStarted = false; camera.updateProjectionMatrix(); frameCamera(); draw(); };
  function stopCamera() { if (cameraFrame) cancelAnimationFrame(cameraFrame); cameraFrame = 0; cameraTime = 0; }
  function settleCamera(time: number) {
    cameraFrame = 0;
    if (disposed || contextLost || !visible || document.hidden || mode === 'orbit') { cameraTime = 0; return; }
    const alpha = cameraBlendFactor(cameraTime ? time - cameraTime : 16.67); cameraTime = time;
    camera.position.lerp(desiredPosition, alpha); controls.target.lerp(desiredTarget, alpha); camera.fov += (desiredFov - camera.fov) * alpha;
    const remaining = camera.position.distanceToSquared(desiredPosition) + controls.target.distanceToSquared(desiredTarget) + Math.abs(desiredFov - camera.fov);
    if (remaining < 0.00001) { camera.position.copy(desiredPosition); controls.target.copy(desiredTarget); camera.fov = desiredFov; cameraTime = 0; }
    else cameraFrame = requestAnimationFrame(settleCamera);
    camera.updateProjectionMatrix(); camera.lookAt(controls.target); draw();
  }
  function aim(position: THREE.Vector3, target: THREE.Vector3, fov: number) {
    desiredPosition.copy(position); desiredTarget.copy(target); desiredFov = fov;
    if (!cameraStarted || calm || camera.position.distanceTo(position) > 12) {
      stopCamera(); cameraStarted = true; camera.position.copy(position); controls.target.copy(target); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(target); return;
    }
    if (!cameraFrame && visible && !document.hidden) cameraFrame = requestAnimationFrame(settleCamera);
  }
  function frameCamera() {
    if (mode === 'orbit') return;
    model.environment.visible = mode === 'ride' && !calm;
    if (calm && mode !== 'top') { aim(v(0, 17, 15), v(0, 0.4, 0), 45); return; }
    (model.scene.fog as THREE.Fog).near = mode === 'ride' ? 12 : 25;
    (model.scene.fog as THREE.Fog).far = mode === 'ride' ? 45 : 65;
    if (mode === 'ride') {
      const pose = immersivePose({ kind, air, progress, ...model.viewpoint(), lookX, lookY, aspect: camera.aspect, calm });
      aim(v(pose.position.x, pose.position.y, pose.position.z), v(pose.target.x, pose.target.y, pose.target.z), pose.fov); return;
    }
    const aspectAdjust = camera.aspect < 1.2 ? 1.2 / Math.max(0.5, camera.aspect) : 1;
    const distance = zoom * Math.min(1.6, aspectAdjust);
    if (mode === 'top') aim(v(0, 22 * distance, 0.01), v(0, 0, 0), 42);
    else { const a = -0.45 + progress * 0.6; aim(v(Math.sin(a) * 17 * distance, (11.5 - Math.sin(progress * Math.PI) * 2) * distance, Math.cos(a) * 17 * distance), v((progress - 0.5) * 1.8, 0.45, -0.3), 42); }
  }
  const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2();
  function pick(event: PointerEvent) {
    const box = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1); ray.setFromCamera(pointer, camera);
    for (const hit of ray.intersectObjects(model.objects, true)) {
      let node: THREE.Object3D | null = hit.object, hidden = false, label = '', anchor: number | undefined;
      while (node) { if (!node.visible) hidden = true; if (node.userData.label) label = node.userData.label; if (typeof node.userData.anchor === 'number') anchor = node.userData.anchor; node = node.parent; }
      if (!hidden && label) return { label, anchor };
    }
    return null;
  }
  const inspect = (event: PointerEvent) => { if (mode === 'orbit' && event.buttons) return; const hit = pick(event); if (mode === 'ride' && !calm && event.pointerType === 'mouse') { lookX = pointer.x; lookY = pointer.y; frameCamera(); draw(); } renderer.domElement.style.cursor = hit ? 'pointer' : mode === 'orbit' ? 'grab' : 'default'; onInspect(hit?.label ?? ''); };
  let press: { x: number; y: number } | null = null;
  const pressStart = (event: PointerEvent) => { press = { x: event.clientX, y: event.clientY }; };
  const pressEnd = (event: PointerEvent) => { const start = press; press = null; if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return; const hit = pick(event); if (hit?.anchor !== undefined) onSelect?.(hit.anchor); };
  const pressCancel = () => { press = null; };
  const leave = () => { onInspect(''); lookX = lookY = 0; if (mode === 'ride') { frameCamera(); draw(); } };
  renderer.domElement.addEventListener('pointermove', inspect); renderer.domElement.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('pointerdown', pressStart); renderer.domElement.addEventListener('pointerup', pressEnd); renderer.domElement.addEventListener('pointercancel', pressCancel);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const resume = () => { if (visible && !document.hidden) { cameraStarted = false; frameCamera(); draw(); } else stopCamera(); };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); }); observer.observe(host);
  document.addEventListener('visibilitychange', resume); resize();
  return {
    update(state: WorldState, nextProgress: number) { progress = clamp(nextProgress); model.setState(state); frameCamera(); draw(); },
    camera(next: CameraMode) { stopCamera(); cameraStarted = false; mode = next; controls.enabled = next === 'orbit'; renderer.domElement.style.touchAction = next === 'orbit' ? 'none' : 'pan-y'; model.environment.visible = next === 'ride' && !calm; frameCamera(); if (next === 'orbit') controls.update(); draw(); },
    comfort(value: boolean) { calm = value; lookX = lookY = 0; frameCamera(); draw(); },
    zoom(delta: number) { zoom = Math.max(0.65, Math.min(1.5, zoom + delta)); if (mode === 'orbit') { camera.position.sub(controls.target).multiplyScalar(delta > 0 ? 1.12 : 0.89).clampLength(7, 36).add(controls.target); } else frameCamera(); draw(); },
    rotate(delta: number) { stopCamera(); mode = 'orbit'; controls.enabled = true; const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(v(0, 1, 0), delta); camera.position.copy(controls.target).add(offset); camera.lookAt(controls.target); controls.update(); draw(); },
    focus(id: number | null) { model.focus(id); labels.forEach((label, index) => label.classList.toggle('is-selected', id === index)); draw(); },
    dispose() { disposed = true; stopCamera(); observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener('visibilitychange', resume); renderer.domElement.removeEventListener('webglcontextlost', loseContext); renderer.domElement.removeEventListener('pointermove', inspect); renderer.domElement.removeEventListener('pointerleave', leave); renderer.domElement.removeEventListener('pointerdown', pressStart); renderer.domElement.removeEventListener('pointerup', pressEnd); renderer.domElement.removeEventListener('pointercancel', pressCancel); controls.dispose(); model.dispose(); reflections.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labels.forEach((label) => label.remove()); },
  };
}
