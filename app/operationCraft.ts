import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = { metal: 0x42616e, dark: 0x10222d, silver: 0xa3bdc5, glass: 0x347b91, amber: 0xffcd7e, cyan: 0x79e9f2 };

// Physical detail belongs to the illustration, not to the game's rules. These
// models retain the triangle / pentagon / circle silhouettes used in the wiki.
// Shared geometry and instancing keep the detail affordable on integrated GPUs.
export function createCraftKit() {
  const geometries = new Map<string, THREE.BufferGeometry>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: number, metalness = 0.35, roughness = 0.5, glow = 0) {
    const key = `${color}:${metalness}:${roughness}:${glow}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: glow }));
    return materials.get(key)!;
  }
  function rounded(w: number, h: number, d: number, r = 0.035) {
    const key = `box:${w}:${h}:${d}:${r}`;
    if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(w, h, d, 2, r));
    return geometries.get(key)!;
  }
  function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, name: string, position = V(0, 0, 0)) {
    const part = new THREE.Mesh(geometry, mat); part.name = name; part.position.copy(position); part.castShadow = true; part.receiveShadow = true; parent.add(part); return part;
  }
  function box(parent: THREE.Object3D, name: string, x: number, y: number, z: number, w: number, h: number, d: number, color = C.metal, r = 0.025) {
    return add(parent, rounded(w, h, d, r), material(color), name, V(x, y, z));
  }
  function instances(parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, mat: THREE.Material, poses: Array<{ position: THREE.Vector3; rotation?: number; scale?: THREE.Vector3 }>) {
    const parts = new THREE.InstancedMesh(geometry, mat, poses.length), dummy = new THREE.Object3D(); parts.name = name;
    poses.forEach((pose, i) => { dummy.position.copy(pose.position); dummy.rotation.set(0, pose.rotation ?? 0, 0); dummy.scale.copy(pose.scale ?? V(1, 1, 1)); dummy.updateMatrix(); parts.setMatrixAt(i, dummy.matrix); });
    parts.castShadow = true; parts.receiveShadow = true; parent.add(parts); return parts;
  }
  function polygon(sides: number, radius: number, depth: number, hole = 0) {
    const key = `polygon:${sides}:${radius}:${depth}:${hole}`;
    if (geometries.has(key)) return geometries.get(key)!;
    const shape = new THREE.Shape();
    for (let i = 0; i <= sides; i++) { const a = i / sides * Math.PI * 2; const x = Math.sin(a) * radius, y = -Math.cos(a) * radius; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
    if (hole) {
      const inset = new THREE.Path();
      for (let i = sides; i >= 0; i--) { const a = i / sides * Math.PI * 2; const x = Math.sin(a) * hole, y = -Math.cos(a) * hole; if (i === sides) inset.moveTo(x, y); else inset.lineTo(x, y); }
      shape.holes.push(inset);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: Math.min(0.016, radius * 0.04), bevelThickness: Math.min(0.012, depth / 3), curveSegments: 1 });
    geometry.translate(0, 0, -depth / 2); geometry.rotateX(-Math.PI / 2); geometries.set(key, geometry); return geometry;
  }
  function unit(sides: number, color: number, label: string) {
    const group = new THREE.Group(); group.name = label; group.scale.setScalar(1.3);
    const bodyMaterial = material(color, 0.62, 0.3, 0.12).clone();
    const body = add(group, polygon(sides, 0.34, 0.13), bodyMaterial, 'ownership hull'); body.userData.label = label;
    add(group, polygon(sides, 0.3, 0.055), material(C.dark, 0.55, 0.24), 'recessed deck', V(0, 0.09, 0));
    add(group, polygon(sides, 0.268, 0.018, 0.237), material(C.silver, 0.72, 0.22), 'inset silhouette', V(0, 0.131, 0));
    add(group, polygon(sides, 0.16, 0.045), material(color, 0.45, 0.27, 0.1), 'role core', V(0, 0.134, 0));
    const heading = box(group, 'forward marker', 0, 0.16, 0.21, 0.05, 0.015, 0.07, 0xe9ffff, 0.007); heading.material = material(0xe9ffff, 0, 0.3, 0.4);
    const vents = Array.from({ length: 6 }, (_, i) => ({ position: V((i % 3 - 1) * 0.057, 0.129, -0.13 - Math.floor(i / 3) * 0.043) }));
    instances(group, 'recessed rear vents', rounded(0.028, 0.018, 0.022, 0.003), material(C.dark), vents);
    if (/helicopter/i.test(label)) {
      const winch = add(group, new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), material(C.silver, 0.8, 0.3), 'rope winch', V(0, -0.09, 0)); winch.rotation.z = Math.PI / 2;
    }
    if (/fighter|warship/i.test(label)) box(group, 'forward weapon mount', 0, 0.18, 0.1, 0.045, 0.05, 0.22, C.silver, 0.009);
    if (sides >= 24) group.children.forEach(part => { part.position.y -= 0.175; });
    return group;
  }
  function station(parent: THREE.Object3D, air: boolean, label: string, color: number) {
    const airport = air && !/Factory|Construction|income/.test(label);
    const factory = /Factory/.test(label);
    const group = new THREE.Group(); group.name = airport ? 'airport architecture' : factory ? 'factory architecture' : 'port architecture'; parent.add(group);
    // The footprint keeps the airport's unmistakable rhombus and a port's circle.
    add(group, polygon(airport ? 4 : 32, 0.66, 0.09), material(C.metal), 'endpoint foundation');
    const head = add(group, polygon(airport ? 4 : 32, 0.4, 0.025, 0.34), material(color, 0.35, 0.35, 0.3), 'endpoint emblem', V(0, 0.065, 0)); head.userData.label = label;
    if (/Construction|income/.test(label)) { group.name = 'symbolic economy endpoint'; return head; }
    box(group, 'service apron', 0, -0.03, 0.9, 2.3, 0.13, 1.15, 0x334650);
    box(group, 'terminal structure', -0.25, 0.19, 1.08, 1.15, 0.35, 0.6, 0x74838a, 0.045);
    box(group, 'terminal roof', -0.25, 0.39, 1.08, 1.23, 0.065, 0.69, C.dark);
    instances(group, 'terminal windows', rounded(0.12, 0.11, 0.018, 0.006), material(C.glass, 0.65, 0.15, 0.16), Array.from({ length: 7 }, (_, i) => ({ position: V(-0.73 + i * 0.16, 0.23, 0.77) })));
    if (airport) {
      box(group, 'tower shaft', 0.73, 0.32, 1.2, 0.17, 0.65, 0.2, 0x879399);
      box(group, 'control room', 0.73, 0.69, 1.2, 0.38, 0.2, 0.34, C.glass);
      box(group, 'control room roof', 0.73, 0.82, 1.2, 0.46, 0.05, 0.4, C.dark);
      box(group, 'runway', 0, -0.015, -0.86, 0.75, 0.04, 1.38, C.dark);
      instances(group, 'runway centre markings', rounded(0.045, 0.006, 0.1, 0.002), material(C.silver), Array.from({ length: 5 }, (_, i) => ({ position: V(0, 0.01, -0.47 - i * 0.22) })));
      instances(group, 'runway edge lamps', rounded(0.035, 0.02, 0.035, 0.003), material(color, 0.1, 0.3, 0.7), Array.from({ length: 12 }, (_, i) => ({ position: V(i % 2 ? -0.36 : 0.36, 0.03, -0.38 - Math.floor(i / 2) * 0.23) })));
    } else if (factory) {
      for (const x of [-0.52, -0.18]) { add(group, new THREE.CylinderGeometry(0.09, 0.12, 0.65, 12), material(C.silver), 'factory exhaust stack', V(x, 0.65, 1.2)); }
      box(group, 'loading door', 0.22, 0.13, 0.77, 0.24, 0.22, 0.02, C.dark);
    } else {
      box(group, 'dock crane leg', 0.87, 0.39, 0.63, 0.09, 0.78, 0.09, C.amber);
      box(group, 'dock crane boom', 0.54, 0.8, 0.63, 0.75, 0.09, 0.09, C.amber);
      box(group, 'cargo hoist', 0.21, 0.58, 0.63, 0.02, 0.4, 0.02, C.silver, 0.004);
    }
    instances(group, 'cargo waiting at endpoint', rounded(0.22, 0.15, 0.32, 0.018), material(0x9b8062), Array.from({ length: 3 }, (_, i) => ({ position: V(-0.86 + i * 0.25, 0.12, 1.62) })));
    return head;
  }
  function carriage(parent: THREE.Object3D, engine: boolean) {
    box(parent, 'undercarriage', 0, 0.17, 0, 0.4, 0.1, 0.6, C.dark);
    box(parent, engine ? 'engine body' : 'cargo body', 0, 0.32, 0, 0.38, 0.22, 0.55, engine ? C.cyan : 0x478b9c, 0.035);
    box(parent, 'rounded roof', 0, 0.45, -0.025, 0.37, 0.055, 0.48, C.silver);
    if (engine) {
      box(parent, 'windscreen', 0, 0.37, 0.28, 0.26, 0.1, 0.016, C.dark, 0.008);
      instances(parent, 'headlights', rounded(0.045, 0.03, 0.015, 0.006), material(0xffeac7, 0, 0.2, 1), [-1, 1].map(side => ({ position: V(side * 0.12, 0.28, 0.284) })));
    }
    instances(parent, 'cargo panel seams', rounded(0.392, 0.18, 0.013, 0.003), material(C.metal), [-0.17, -0.06, 0.06, 0.17].map(z => ({ position: V(0, 0.31, z) })));
    const axles: THREE.Group[] = [];
    for (const z of [-0.18, 0.18]) {
      const axle = new THREE.Group(); axle.name = 'rolling axle'; axle.position.set(0, 0.13, z); parent.add(axle); axles.push(axle);
      for (const side of [-1, 1]) {
        const wheel = add(axle, new THREE.CylinderGeometry(0.074, 0.074, 0.043, 16), material(C.dark, 0.7, 0.38), 'flanged wheel', V(side * 0.19, 0, 0)); wheel.rotation.z = Math.PI / 2;
        const hub = add(axle, new THREE.CylinderGeometry(0.037, 0.037, 0.046, 12), material(C.silver, 0.8, 0.25), 'wheel hub', V(side * 0.195, 0, 0)); hub.rotation.z = Math.PI / 2;
        box(axle, 'wheel spoke', side * 0.221, 0, 0, 0.008, 0.115, 0.012, C.metal, 0.002);
      }
    }
    return axles;
  }
  function city(parent: THREE.Object3D, w: number, height: number, d: number) {
    box(parent, 'building plinth', 0, -0.47, 0, w * 1.06, 0.06, d * 1.03, C.dark);
    box(parent, 'roof coping', 0, 0.49, 0, w * 1.07, 0.04, d * 1.04, C.silver);
    const poses = [];
    for (let row = 0; row < Math.round(height * 3); row++) for (let col = 0; col < 3; col++) for (const side of [-1, 1]) poses.push({ position: V((col - 1) * w * 0.26, -0.34 + row / Math.round(height * 3) * 0.78, side * (d / 2 + 0.005)) });
    instances(parent, 'occupied floors', rounded(w * 0.16, 0.06, 0.012, 0.005), material(C.glass, 0.65, 0.2, 0.18), poses);
    box(parent, 'roof services', w * 0.2, 0.56, 0, w * 0.28, 0.12, d * 0.28, C.dark);
  }
  function trooper(parent: THREE.Object3D, color: number) {
    add(parent, new THREE.SphereGeometry(0.075, 10, 8), material(0x9cadac, 0.25, 0.8), 'helmet', V(0, 0.18, 0));
    box(parent, 'equipment pack', 0, 0.01, -0.085, 0.11, 0.16, 0.07, C.dark, 0.012);
    const arms = [-1, 1].map(side => { const arm = box(parent, 'rope grip arm', side * 0.105, 0.03, 0, 0.04, 0.17, 0.04, color, 0.015); arm.rotation.z = side * 0.2; return arm; });
    const legs = [-1, 1].map(side => box(parent, 'walking leg', side * 0.047, -0.17, 0, 0.055, 0.18, 0.06, C.dark, 0.015));
    return { arms, legs };
  }
  return { material, rounded, add, box, instances, polygon, unit, station, carriage, city, trooper };
}

// Height is derived from the coastline's contour, not random vertices. The
// flat interior supports endpoints; the outer shelves read as coastal relief.
export function coastlineGeometry(cx: number, cz: number, rx: number, rz: number, seed: number) {
  const segments = 80, rings = 6, positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const rock = new THREE.Color(0x28434c), shore = new THREE.Color(0x61766f), land = new THREE.Color(0x40594e);
  for (let ring = 0; ring <= rings; ring++) {
    const radius = ring / rings;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2;
      const contour = 1 + Math.sin(a * 3 + seed) * 0.06 + Math.cos(a * 7 + seed) * 0.028;
      const y = radius < 0.78 ? -0.047 : -0.047 - Math.pow((radius - 0.78) / 0.22, 1.4) * 0.3;
      positions.push(cx + Math.cos(a) * rx * radius * contour, y, cz + Math.sin(a) * rz * radius * contour);
      const color = radius < 0.66 ? land : radius < 0.9 ? shore : rock;
      colors.push(color.r, color.g, color.b);
      if (ring < rings && i < segments) { const p = ring * (segments + 1) + i; indices.push(p, p + 1, p + segments + 1, p + 1, p + segments + 2, p + segments + 1); }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function waterMaterial() {
  const phase = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: 0x174f65, metalness: 0.4, roughness: 0.3 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uStoryPhase = phase;
    shader.vertexShader = 'varying vec3 vWaterPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaterPosition = position;');
    shader.fragmentShader = 'varying vec3 vWaterPosition;\nuniform float uStoryPhase;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float rippleA = sin(vWaterPosition.x * 5.0 + vWaterPosition.z * 2.0 + uStoryPhase * 4.0);
      float rippleB = cos(vWaterPosition.z * 9.0 - vWaterPosition.x * 3.0 - uStoryPhase * 3.0);
      normal = normalize(mat3(viewMatrix) * vec3(rippleA * 0.07, 1.0, rippleB * 0.045));
    `);
  };
  material.customProgramCacheKey = () => 'story-water-v1';
  return { material, phase };
}
