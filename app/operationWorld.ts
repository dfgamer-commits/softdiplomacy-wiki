import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type WorldKind = 'trade' | 'intercept' | 'landing' | 'rail' | 'territory' | 'construction' | 'economy' | 'network';
export type WorldState = { flight: number; prepare: number; interact: number; outcome: number; shot: number; shotVisible: boolean; impact: number; targetVisible: boolean; engaging: boolean; rope: number; descent: number[]; advance: number; carrierOpacity: number; connection?: number; timeline?: number; enemyApproach?: number };
export type CameraMode = 'cinematic' | 'orbit' | 'top';
const cyan = 0x79e9f2, amber = 0xffcd7e, red = 0xff7f70;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (n: number) => Math.min(1, Math.max(0, n));

// Build the scene separately from WebGL so geometry, routing, and lifecycle can
// be regression-tested without a browser or a graphics device.
export function buildOperationModel(kind: WorldKind, air: boolean) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071019);
  scene.fog = new THREE.Fog(0x071019, 25, 65);
  scene.add(new THREE.HemisphereLight(0xc0f4ff, 0x182632, 2.4));
  const sun = new THREE.DirectionalLight(0xe2f6ff, 3.2);
  sun.position.set(-5, 12, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  sun.shadow.normalBias = 0.03; scene.add(sun);
  const fill = new THREE.PointLight(cyan, 22, 22); fill.position.set(2, 4, -5); scene.add(fill);
  const root = new THREE.Group(); scene.add(root);
  const surface = new THREE.MeshStandardMaterial({ color: 0x173a49, roughness: 0.67, metalness: 0.35 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.42, 11), surface); floor.position.y = -0.28; floor.receiveShadow = true; root.add(floor);
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(floor.geometry), new THREE.LineBasicMaterial({ color: 0x527788 })); rim.position.copy(floor.position); root.add(rim);
  // Tile grid is a spatial reference, not a radar or a gameplay range.
  const grid = new THREE.GridHelper(18, 18, 0x385662, 0x203b48); grid.position.y = -0.045; grid.scale.z = 0.6; root.add(grid);
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
    mesh(new THREE.CylinderGeometry(0.63, 0.73, 0.16, air ? 4 : 16), 0x315363, group);
    const head = mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.12, air ? 4 : 16), color, group, 0.3); head.position.y = 0.16;
    // Two status lamps show the endpoint becoming ready, not an invented radius.
    for (let i = 0; i < 2; i++) mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), color, group, 0.5).position.set((i ? 1 : -1) * 0.48, 0.16, 0.48);
    head.userData.label = label; objects.push(head); return group;
  }
  function unit(sides: number, color: number, label: string) {
    const group = new THREE.Group(); group.scale.setScalar(1.3); content.add(group);
    const body = mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.15, sides), color, group, 0.22);
    body.userData.label = label; objects.push(body);
    mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.17, sides), 0x08232e, group).position.y = 0.025;
    const pin = mesh(new THREE.SphereGeometry(0.045, 8, 6), 0xecffff, group, 1); pin.position.set(0, 0.13, 0.21);
    return group;
  }
  const height = air ? 1.8 : 0.25;
  const end = kind === 'intercept' ? v(-0.6, height, 0) : v(6, kind === 'landing' ? height : air ? 0.42 : height, 1.5);
  const curve = new THREE.CubicBezierCurve3(v(-6, air ? 0.48 : 0.25, 2), v(-3.7, air ? height + 0.5 : height, -3.5), v(2, air ? height + 0.6 : height, -3.8), end);
  const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(100)), new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.2 })); content.add(guide);
  const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(100)), new THREE.LineBasicMaterial({ color: cyan })); content.add(trail);
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
  const flash = new THREE.PointLight(amber, 0, 7); content.add(flash);
  const burst = Array.from({ length: 8 }, () => mesh(new THREE.TetrahedronGeometry(0.07), amber, content, 0.6));
  const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([end, end]), new THREE.LineBasicMaterial({ color: 0xffeac7 })); content.add(rope);
  const troops = [0, 1, 2].map(() => mesh(new THREE.CapsuleGeometry(0.075, 0.16, 3, 6), amber));
  const landing = mesh(new THREE.BoxGeometry(1.6, 0.07, 1.6), 0x4c644e); landing.position.copy(v(end.x, 0.03, end.z));
  const railCurve = new THREE.CatmullRomCurve3([v(-7, 0.13, 2), v(-4, 0.13, 2), v(-2, 0.13, -1.8), v(1.5, 0.13, -1.8), v(4, 0.13, 1.5), v(7, 0.13, 1.5)]);
  const railGroup = new THREE.Group(); content.add(railGroup);
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 160 }, (_, i) => { const t = i / 159, p = railCurve.getPointAt(t), tangent = railCurve.getTangentAt(t); return p.add(v(-tangent.z, 0, tangent.x).multiplyScalar(side * 0.18)); });
    railGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xc6d7db })));
  }
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.065, 0.07), new THREE.MeshStandardMaterial({ color: 0x426574 }), 90); railGroup.add(ties);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 90; i++) { const t = i / 89, tangent = railCurve.getTangentAt(t); dummy.position.copy(railCurve.getPointAt(t)); dummy.rotation.y = Math.atan2(tangent.x, tangent.z); dummy.updateMatrix(); ties.setMatrixAt(i, dummy.matrix); }
  const train = [0, 1, 2].map((i) => {
    const car = new THREE.Group(); railGroup.add(car);
    mesh(new THREE.BoxGeometry(0.4, 0.24, 0.59), i ? 0x478b9c : cyan, car, 0.1).position.y = 0.17;
    mesh(new THREE.BoxGeometry(0.3, 0.03, 0.43), 0xb3ecf0, car).position.y = 0.31;
    for (const z of [-0.18, 0.18]) { const wheels = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.52, 8), 0x10232c, car); wheels.rotation.z = Math.PI / 2; wheels.position.set(0, 0.03, z); }
    return car;
  });
  const couplers = [0, 1].map(() => { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xc0d6de })); railGroup.add(line); return line; });
  const columns = [0, 1, 2].map((i) => { const c = mesh(new THREE.BoxGeometry(0.9, 1, 1.2), cyan); c.position.x = (i - 1) * 1.2; return c; });
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
  if (routeScene) {
    for (const point of [v(-6.7, 0, 2.6), v(6.6, 0, 2.4)]) {
      const shore = mesh(new THREE.BoxGeometry(3.8, 0.1, 3.3), 0x304b43, shores); shore.position.copy(point);
      if (!air) shore.position.z = 4.7;
    }
    surface.color.setHex(air ? 0x203d39 : 0x143c50);
  }
  const anchors = [0, 1, 2].map((id) => ({ id, label: '', position: v(0, 0, 0), visible: true }));
  if (!air && routeScene) {
    for (const point of [v(-6, 0.04, 2.6), v(6, 0.04, 2.25)]) { const pier = mesh(new THREE.BoxGeometry(0.65, 0.1, 1.65), 0x53676b); pier.position.copy(point); }
  }
  const selection = ring(0.72, 0xf6f5d9); selection.visible = false;
  let selected: number | null = null;
  function focus(id: number | null) { selected = id; selection.visible = id !== null; if (id !== null) selection.position.copy(anchors[id].position).add(v(0, -0.5, 0)); }
  const ledger = new THREE.Group(); content.add(ledger); ledger.visible = ['trade', 'economy', 'construction'].includes(kind);
  const moneyPaths = [0, 1].map(() => { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]), new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0.6 })); ledger.add(line); return line; });
  const reserve = Array.from({ length: 8 }, () => mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 6), cyan));
  const payload = [0, 1, 2].map(() => mesh(new THREE.CapsuleGeometry(0.075, 0.17, 3, 6), amber));
  const troopsInCombat = [0, 1, 2].map(() => mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 6), amber));
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
  function segment(line: THREE.Line, start: THREE.Vector3, finish: THREE.Vector3) {
    const points = line.geometry.attributes.position as THREE.BufferAttribute; points.setXYZ(0, start.x, start.y, start.z); points.setXYZ(1, finish.x, finish.y, finish.z); points.needsUpdate = true; line.geometry.computeBoundingSphere();
  }
  function anchor(id: number, label: string, position: THREE.Vector3) { anchors[id].label = label; anchors[id].position.copy(position); }
  function setState(s: WorldState) {
    const flight = clamp(s.flight);
    moving.position.copy(curve.getPointAt(flight)); const tangent = curve.getTangentAt(flight); moving.rotation.y = Math.atan2(tangent.x, tangent.z);
    moving.visible = routeScene && s.carrierOpacity > 0.05;
    (moving.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.setHex(s.engaging ? red : kind === 'landing' ? amber : cyan);
    trail.geometry.setDrawRange(0, Math.max(0, Math.floor(flight * 100) + 1));
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
    const muzzle = moving.position.clone().add(enemy.position.clone().sub(moving.position).normalize().multiplyScalar(0.45));
    shell.position.lerpVectors(muzzle, enemy.position, s.shot);
    shell.quaternion.setFromUnitVectors(v(0, 1, 0), enemy.position.clone().sub(muzzle).normalize());
    flash.position.copy(shell.position); flash.intensity = shell.visible ? 3 : 0;
    burst.forEach((item, i) => { item.visible = kind === 'intercept' && s.impact > 0 && s.impact < 1; const a = i * 2.399; item.position.copy(enemyPosition).add(v(Math.cos(a) * s.impact * 0.8, Math.sin(i * 1.8) * s.impact * 0.5, Math.sin(a) * s.impact * 0.8)); item.scale.setScalar(Math.max(0.01, 1 - s.impact)); });
    patrol.visible = kind === 'intercept' && s.outcome > 0;
    if (patrol.visible) { const angle = s.outcome * Math.PI * 2; moving.position.copy(end).add(v(Math.sin(angle) * 1.25, 0, (1 - Math.cos(angle)) * 1.25)); moving.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle)); radius.position.copy(moving.position); }
    rope.visible = kind === 'landing' && air && s.rope > 0 && s.carrierOpacity > 0.05;
    const ropeArray = rope.geometry.attributes.position as THREE.BufferAttribute; ropeArray.setXYZ(0, end.x, end.y, end.z); ropeArray.setXYZ(1, end.x, end.y - s.rope * (end.y - 0.25), end.z); ropeArray.needsUpdate = true;
    troops.forEach((item, i) => { const d = s.descent[i] ?? 0; item.visible = kind === 'landing' && d > 0; item.position.set(end.x + (i - 1) * 0.23 * d + s.advance * 0.8, air ? end.y * (1 - d) + 0.3 * d : 0.3, end.z); });
    train.forEach((car, i) => { const t = 0.1 + flight * 0.82 - i * 0.035; car.position.copy(railCurve.getPointAt(t)); const direction = railCurve.getTangentAt(t); car.rotation.y = Math.atan2(direction.x, direction.z); });
    const connection = s.connection ?? 1;
    if (kind === 'rail') {
      departure.position.copy(railCurve.getPointAt(0.1)); destination.position.copy(railCurve.getPointAt(0.92));
      railGroup.visible = connection > 0;
      railGroup.children.filter((child) => child instanceof THREE.Line && !couplers.includes(child)).forEach((line) => (line as THREE.Line).geometry.setDrawRange(0, Math.floor(connection * 160)));
      ties.count = Math.floor(connection * 90);
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
    troopsInCombat.forEach((unit, i) => { unit.visible = kind === 'territory' && commitment > 0 && !(i === 0 && s.interact > 0.7); unit.position.set(-6.2 + s.flight * 5.2 + s.outcome * 2.5, 0.3, (i - 1) * 0.85); });
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
  return { scene, root, mapMaterial, setState, dispose, curve, railCurve, train, moving, enemy, shell, troops, objects, trail, anchors, focus, coins, partnerCoins, reserve, payload, couplers, railGroup, capacity, radius, airportPayout, patrol };
}

export function createOperationWorld(host: HTMLElement, kind: WorldKind, air: boolean, onInspect: (label: string) => void, onFailure?: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const model = buildOperationModel(kind, air);
  const labels = model.anchors.map(() => { const label = document.createElement('span'); label.className = 'operations-world-label'; host.appendChild(label); return label; });
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100); camera.position.set(9, 12, 15);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.enablePan = false; controls.enableZoom = false; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.35; controls.enabled = false;
  renderer.domElement.style.touchAction = 'pan-y';
  let mode: CameraMode = 'cinematic', zoom = 1, disposed = false, visible = true, progress = 0, contextLost = false;
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
      label.hidden = point.z < -1 || point.z > 1 || y < 55 || y > host.clientHeight - 130;
      label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if (!label.hidden) boxes.push({ x, y, width, height });
    });
  } };
  const loseContext = (event: Event) => { if (!disposed) { event.preventDefault(); contextLost = true; onFailure?.(); } };
  renderer.domElement.addEventListener('webglcontextlost', loseContext);
  controls.addEventListener('change', draw);
  const resize = () => { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); frameCamera(); draw(); };
  function frameCamera() {
    if (mode === 'orbit') return;
    const aspectAdjust = camera.aspect < 1.2 ? 1.2 / Math.max(0.5, camera.aspect) : 1;
    const distance = zoom * Math.min(1.6, aspectAdjust);
    if (mode === 'top') { camera.position.set(0, 22 * distance, 0.01); controls.target.set(0, 0, 0); }
    else { const a = -0.45 + progress * 0.6; camera.position.set(Math.sin(a) * 17 * distance, (11.5 - Math.sin(progress * Math.PI) * 2) * distance, Math.cos(a) * 17 * distance); controls.target.set((progress - 0.5) * 1.8, 0.45, -0.3); }
    camera.lookAt(controls.target);
  }
  const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2();
  const inspect = (event: PointerEvent) => { if (mode === 'orbit' && event.buttons) return; const box = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1); ray.setFromCamera(pointer, camera); const hit = ray.intersectObjects(model.objects).find((item) => { let node: THREE.Object3D | null = item.object; while (node) { if (!node.visible) return false; node = node.parent; } return true; }); onInspect(hit?.object.userData.label ?? ''); };
  const leave = () => onInspect('');
  renderer.domElement.addEventListener('pointermove', inspect); renderer.domElement.addEventListener('pointerleave', leave);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) draw(); }); observer.observe(host);
  document.addEventListener('visibilitychange', draw); resize();
  return {
    update(state: WorldState, nextProgress: number) { progress = clamp(nextProgress); model.setState(state); frameCamera(); draw(); },
    camera(next: CameraMode) { mode = next; controls.enabled = next === 'orbit'; renderer.domElement.style.touchAction = next === 'orbit' ? 'none' : 'pan-y'; frameCamera(); controls.update(); draw(); },
    zoom(delta: number) { zoom = Math.max(0.65, Math.min(1.5, zoom + delta)); if (mode === 'orbit') { camera.position.sub(controls.target).multiplyScalar(delta > 0 ? 1.12 : 0.89).clampLength(7, 36).add(controls.target); } else frameCamera(); draw(); },
    rotate(delta: number) { mode = 'orbit'; controls.enabled = true; const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(v(0, 1, 0), delta); camera.position.copy(controls.target).add(offset); camera.lookAt(controls.target); controls.update(); draw(); },
    focus(id: number | null) { model.focus(id); labels.forEach((label, index) => label.classList.toggle('is-selected', id === index)); draw(); },
    dispose() { disposed = true; observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener('visibilitychange', draw); renderer.domElement.removeEventListener('webglcontextlost', loseContext); renderer.domElement.removeEventListener('pointermove', inspect); renderer.domElement.removeEventListener('pointerleave', leave); controls.dispose(); model.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labels.forEach((label) => label.remove()); },
  };
}
