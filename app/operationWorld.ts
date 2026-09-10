import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type WorldKind = 'trade' | 'intercept' | 'landing' | 'rail' | 'territory' | 'construction' | 'economy' | 'network';
export type WorldState = { flight: number; prepare: number; interact: number; outcome: number; shot: number; shotVisible: boolean; impact: number; targetVisible: boolean; engaging: boolean; rope: number; descent: number[]; advance: number; carrierOpacity: number };
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
  const grid = new THREE.GridHelper(18, 30, 0x598896, 0x244855); grid.position.y = -0.045; grid.scale.z = 0.6; root.add(grid);
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
    ring(0.9, color, group).position.y = 0.04;
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.05, 0.13, 0.05), color, group, 1).position.set(Math.sin(i * Math.PI / 2) * 0.75, 0.13, Math.cos(i * Math.PI / 2) * 0.75);
    head.userData.label = label; objects.push(head); return group;
  }
  function unit(sides: number, color: number, label: string) {
    const group = new THREE.Group(); group.scale.setScalar(1.3); content.add(group);
    const body = mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.15, sides), color, group, 0.22);
    body.userData.label = label; objects.push(body);
    mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.17, sides), 0x08232e, group).position.y = 0.025;
    ring(0.5, color, group).position.y = -0.02;
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
  const arrivals = [ring(1, amber), ring(1.1, amber)]; arrivals.forEach((item) => item.position.copy(v(end.x, 0.11, end.z)));
  const enemy = unit(air ? 3 : 24, red, air ? 'Enemy helicopter' : 'Enemy transport');
  const enemyPosition = v(3.5, height, 0); enemy.position.copy(enemyPosition);
  const radius = ring(4.2, cyan); radius.position.copy(v(-0.6, 0.05, 0));
  const lock = new THREE.Group(); content.add(lock); lock.position.copy(enemyPosition);
  for (let i = 0; i < 4; i++) { const bar = mesh(new THREE.BoxGeometry(0.3, 0.025, 0.045), amber, lock, 0.8); bar.position.set(Math.sin(i * Math.PI / 2) * 0.65, 0, Math.cos(i * Math.PI / 2) * 0.65); bar.rotation.y = i * Math.PI / 2; }
  const shell = mesh(new THREE.CapsuleGeometry(0.055, 0.2, 4, 8), 0xffe3ac, content, 2); shell.rotation.z = Math.PI / 2;
  const flash = new THREE.PointLight(amber, 0, 7); content.add(flash);
  const burst = Array.from({ length: 24 }, () => mesh(new THREE.TetrahedronGeometry(0.07), amber, content, 0.6));
  const shock = ring(0.3, amber); shock.position.copy(enemyPosition);
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
  const columns = [0, 1, 2].map((i) => { const c = mesh(new THREE.BoxGeometry(0.9, 1, 1.2), cyan); c.position.x = (i - 1) * 1.2; return c; });
  const blueprint = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.2, 3.2, 2)), new THREE.LineBasicMaterial({ color: 0x6cced8, transparent: true, opacity: 0.35 })); blueprint.position.y = 1.6; content.add(blueprint);
  const tiles = Array.from({ length: 45 }, (_, i) => { const tile = mesh(new THREE.BoxGeometry(0.85, 0.12, 0.85), i % 9 < 4 ? 0x397584 : 0x4d3a48); tile.position.set((i % 9 - 4) * 0.92, 0.09, (Math.floor(i / 9) - 2) * 0.92); return tile; });
  const coins = Array.from({ length: 12 }, () => { const coin = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), amber, content, 0.2); return coin; });
  const network = [0, 1, 2].map((i) => ({ unit: unit(i === 1 ? 5 : 3, i === 2 ? amber : cyan, ['Passenger plane', 'Fighter jet', 'Attack helicopter'][i]), curve: new THREE.CubicBezierCurve3(v(-5, 0.5, 0), v(-2, 2, 0), v(2, 2.3, (i - 1) * 3), v(6, 0.7, (i - 1) * 3)) }));
  network.forEach(({ curve: route }) => content.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(60)), new THREE.LineBasicMaterial({ color: 0x385a67 }))));
  // Keep each topic's scene distinct; unused mesh families never appear.
  const routeScene = ['trade', 'intercept', 'landing'].includes(kind);
  guide.visible = trail.visible = moving.visible = routeScene;
  departure.visible = destination.visible = routeScene || kind === 'rail' || kind === 'network';
  if (kind === 'network') departure.position.set(-5, 0.08, 0);
  enemy.visible = radius.visible = lock.visible = shell.visible = shock.visible = kind === 'intercept';
  rope.visible = landing.visible = kind === 'landing';
  railGroup.visible = kind === 'rail'; blueprint.visible = kind === 'construction';
  columns.forEach((c) => { c.visible = kind === 'construction'; });
  tiles.forEach((c) => { c.visible = kind === 'territory'; });
  network.forEach((item) => { item.unit.visible = kind === 'network'; });
  // Network guides are the only final three children of the content group.
  content.children.slice(-3).forEach((item) => { item.visible = kind === 'network'; });
  destination.visible = kind === 'trade' || kind === 'rail';
  if (kind === 'economy') { departure.visible = destination.visible = true; departure.position.set(-5, 0.08, 0); destination.position.set(5, 0.08, 0); ring(1.7, amber).position.y = 0.07; }
  function setState(s: WorldState) {
    const flight = clamp(s.flight);
    moving.position.copy(curve.getPointAt(flight)); const tangent = curve.getTangentAt(flight); moving.rotation.y = Math.atan2(tangent.x, tangent.z);
    moving.visible = routeScene && s.carrierOpacity > 0.05;
    (moving.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.setHex(s.engaging ? red : kind === 'landing' ? amber : cyan);
    trail.geometry.setDrawRange(0, Math.max(0, Math.floor(flight * 100) + 1));
    motes.forEach((item, i) => { item.visible = routeScene && flight > 0 && s.carrierOpacity > 0.05; item.position.copy(curve.getPointAt(Math.max(0, flight - (i + 1) * 0.009))); });
    arrivals.forEach((item, i) => { item.visible = kind === 'trade' && s.outcome > 0; item.scale.setScalar(1 + s.outcome * (i + 1) * 0.6); (item.material as THREE.MeshBasicMaterial).opacity = (1 - s.outcome) * 0.8; });
    enemy.visible = kind === 'intercept' && s.targetVisible;
    radius.visible = kind === 'intercept' && flight > 0.7; radius.rotation.z = s.interact;
    lock.visible = kind === 'intercept' && s.engaging && s.targetVisible; lock.scale.setScalar(1.4 - s.interact * 0.4);
    shell.visible = kind === 'intercept' && s.shotVisible; shell.position.lerpVectors(v(-0.2, height, 0), enemyPosition, s.shot);
    flash.position.copy(shell.position); flash.intensity = shell.visible ? 3 : 0;
    shock.visible = kind === 'intercept' && s.impact > 0 && s.impact < 1; shock.scale.setScalar(1 + s.impact * 7); (shock.material as THREE.MeshBasicMaterial).opacity = 1 - s.impact;
    burst.forEach((item, i) => { item.visible = shock.visible; const a = i * 2.399; item.position.copy(enemyPosition).add(v(Math.cos(a) * s.impact * 2.3, Math.sin(i * 1.8) * s.impact * 1.4, Math.sin(a) * s.impact * 2.3)); item.scale.setScalar(Math.max(0.01, 1 - s.impact)); });
    rope.visible = kind === 'landing' && air && s.rope > 0 && s.carrierOpacity > 0.05;
    const ropeArray = rope.geometry.attributes.position as THREE.BufferAttribute; ropeArray.setXYZ(0, end.x, end.y, end.z); ropeArray.setXYZ(1, end.x, end.y - s.rope * (end.y - 0.25), end.z); ropeArray.needsUpdate = true;
    troops.forEach((item, i) => { const d = s.descent[i] ?? 0; item.visible = kind === 'landing' && d > 0; item.position.set(end.x + (i - 1) * 0.23 * d + s.advance * 0.8, air ? end.y * (1 - d) + 0.3 * d : 0.3, end.z); });
    train.forEach((car, i) => { const t = 0.1 + flight * 0.82 - i * 0.035; car.position.copy(railCurve.getPointAt(t)); const direction = railCurve.getTangentAt(t); car.rotation.y = Math.atan2(direction.x, direction.z); });
    columns.forEach((column, i) => { const h = Math.max(0.03, s.interact * (1.8 + (i === 1 ? 1.2 : i * 0.25))); column.scale.y = h; column.position.y = h / 2; }); blueprint.visible = kind === 'construction' && s.interact < 1;
    tiles.forEach((tile, i) => { tile.material.color.setHex(i % 9 < 4 + Math.floor(s.outcome * 3) ? 0x397584 : 0x4d3a48); tile.position.y = 0.09 + s.prepare * 0.04; });
    coins.forEach((coin, i) => {
      coin.visible = kind === 'economy' || (kind === 'trade' && s.outcome > 0);
      if (kind === 'economy') coin.position.set(-4.5 + clamp(s.prepare + i * 0.01) * 4.5 + s.outcome * 4.5, 0.2 + i * 0.07, 0);
      else coin.position.set(end.x + (i % 3 - 1) * 0.2, 0.2 + i * 0.08 + s.outcome * 0.4, end.z);
    });
    network.forEach((item, i) => { const t = clamp(s.interact * 1.4 - i * 0.15); item.unit.position.copy(item.curve.getPointAt(t)); const direction = item.curve.getTangentAt(t); item.unit.rotation.y = Math.atan2(direction.x, direction.z); });
  }
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse((item) => { const drawable = item as THREE.Mesh; if (drawable.geometry) geometries.add(drawable.geometry); if (drawable.material) (Array.isArray(drawable.material) ? drawable.material : [drawable.material]).forEach((m) => materials.add(m)); });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
    sun.shadow.map?.dispose(); scene.clear();
  }
  return { scene, root, mapMaterial, setState, dispose, curve, railCurve, train, moving, enemy, shell, troops, objects, trail };
}

export function createOperationWorld(host: HTMLElement, kind: WorldKind, air: boolean, onInspect: (label: string) => void, onFailure?: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const model = buildOperationModel(kind, air);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100); camera.position.set(9, 12, 15);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.enablePan = false; controls.enableZoom = false; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.35; controls.enabled = false;
  renderer.domElement.style.touchAction = 'pan-y';
  let mode: CameraMode = 'cinematic', zoom = 1, disposed = false, visible = true, progress = 0, contextLost = false;
  const draw = () => { if (!disposed && !contextLost && visible && !document.hidden) renderer.render(model.scene, camera); };
  const loseContext = (event: Event) => { if (!disposed) { event.preventDefault(); contextLost = true; onFailure?.(); } };
  renderer.domElement.addEventListener('webglcontextlost', loseContext);
  controls.addEventListener('change', draw);
  const texture = new THREE.TextureLoader().load('/images/World_map.webp', (loaded) => { if (disposed) { loaded.dispose(); return; } loaded.colorSpace = THREE.SRGBColorSpace; model.mapMaterial.map = loaded; model.mapMaterial.needsUpdate = true; draw(); });
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
    dispose() { disposed = true; observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener('visibilitychange', draw); renderer.domElement.removeEventListener('webglcontextlost', loseContext); renderer.domElement.removeEventListener('pointermove', inspect); renderer.domElement.removeEventListener('pointerleave', leave); controls.dispose(); texture.dispose(); model.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); },
  };
}
