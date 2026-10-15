import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { PcPartId } from "./pc-parts";

type XYZ = [number, number, number];

/** Original stylized cutaway. Geometry is illustrative, never a stock/compatibility claim. */
export function createPcModel() {
  const root = new THREE.Group();
  const parts = {} as Record<PcPartId, THREE.Group>;
  const materials = {} as Record<PcPartId, Set<THREE.MeshStandardMaterial>>;
  const geometries = new Map<string, THREE.BufferGeometry>();
  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  function group(id: PcPartId) {
    const result = new THREE.Group();
    result.userData.part = id;
    result.name = id;
    parts[id] = result;
    materials[id] = new Set();
    root.add(result);
    return result;
  }
  function material(parent: THREE.Group, color: string, metalness = 0.1) {
    const id = parent.userData.part as PcPartId;
    const key = `${id}:${color}:${metalness}`;
    if (!materialCache.has(key))
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: metalness > 0.5 ? 0.3 : 0.55,
          metalness,
        }),
      );
    const result = materialCache.get(key)!;
    materials[id].add(result);
    return result;
  }
  function mesh(
    parent: THREE.Group,
    geometry: THREE.BufferGeometry,
    pos: XYZ,
    color: string,
    metalness = 0.1,
  ) {
    const item = new THREE.Mesh(geometry, material(parent, color, metalness));
    item.position.set(...pos);
    item.castShadow = true;
    item.receiveShadow = true;
    item.userData.part = parent.userData.part;
    parent.add(item);
    return item;
  }
  function box(
    parent: THREE.Group,
    size: XYZ,
    pos: XYZ,
    color: string,
    radius = 0.025,
    metalness = 0.1,
  ) {
    const key = `box:${size}:${radius}`;
    if (!geometries.has(key))
      geometries.set(
        key,
        new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((n) => n / 3))),
      );
    return mesh(parent, geometries.get(key)!, pos, color, metalness);
  }
  function cylinder(
    parent: THREE.Group,
    r: number,
    depth: number,
    pos: XYZ,
    color: string,
    rotation: XYZ = [Math.PI / 2, 0, 0],
  ) {
    const key = `cylinder:${r}:${depth}`;
    if (!geometries.has(key)) geometries.set(key, new THREE.CylinderGeometry(r, r, depth, 32));
    const item = mesh(parent, geometries.get(key)!, pos, color, 0.35);
    item.rotation.set(...rotation);
    return item;
  }
  function fan(parent: THREE.Group, pos: XYZ, r: number, trim: string, facingX = false) {
    const assembly = new THREE.Group();
    assembly.userData.part = parent.userData.part;
    assembly.position.set(...pos);
    if (facingX) assembly.rotation.y = Math.PI / 2;
    parent.add(assembly);
    // Helpers use the category stored on the assembly, so every visible blade is clickable.
    box(assembly, [r * 2.23, r * 2.23, 0.09], [0, 0, 0], "#313b38", 0.07);
    const ringKey = `ring:${r}`;
    if (!geometries.has(ringKey)) geometries.set(ringKey, new THREE.TorusGeometry(r, 0.035, 8, 48));
    mesh(assembly, geometries.get(ringKey)!, [0, 0, 0.07], trim, 0.3);
    cylinder(assembly, r * 0.91, 0.045, [0, 0, 0.06], "#182623");
    for (let i = 0; i < 9; i++) {
      const angle = (i * Math.PI * 2) / 9;
      const blade = box(
        assembly,
        [r * 0.65, r * 0.25, 0.035],
        [Math.cos(angle) * r * 0.49, Math.sin(angle) * r * 0.49, 0.1],
        "#667873",
        0.05,
      );
      blade.rotation.z = angle + 0.4;
    }
    cylinder(assembly, r * 0.22, 0.09, [0, 0, 0.14], trim);
    cylinder(assembly, r * 0.065, 0.095, [0, 0, 0.15], "#e5e2d3");
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        cylinder(assembly, 0.022, 0.02, [x * r * 0.98, y * r * 0.98, 0.06], "#b5b6ad");
  }
  function cable(parent: THREE.Group, points: XYZ[], color: string, radius = 0.025) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const geometry = new THREE.TubeGeometry(curve, 20, radius, 6, false);
    geometries.set(`cable:${geometries.size}`, geometry);
    mesh(parent, geometry, [0, 0, 0], color);
  }

  const chassis = group("case");
  const cream = "#eee9d9";
  // Open side faces +Z. Front intake column is on the right (+X).
  box(chassis, [2.6, 0.13, 1.9], [0, -2, 0], cream, 0.04);
  box(chassis, [2.6, 0.13, 1.9], [0, 2, 0], cream, 0.04);
  box(chassis, [2.6, 3.9, 0.09], [0, 0, -0.91], "#d9d7ca");
  for (const x of [-1.24, 1.24])
    for (const z of [-0.86, 0.86]) box(chassis, [0.12, 3.95, 0.12], [x, 0, z], cream, 0.02, 0.3);
  box(chassis, [0.17, 3.85, 1.72], [1.22, 0, 0], cream, 0.02);
  for (const x of [-0.95, 0.95])
    for (const z of [-0.64, 0.64]) box(chassis, [0.35, 0.18, 0.32], [x, -2.15, z], "#323b37", 0.05);
  for (let i = 0; i < 15; i++)
    box(chassis, [0.035, 0.015, 1.2], [-0.65 + i * 0.105, 2.075, -0.05], "#737e73", 0.005);
  cylinder(chassis, 0.065, 0.015, [0.82, 2.08, 0.55], "#ef6841", [0, 0, 0]);
  box(chassis, [0.18, 0.02, 0.055], [0.5, 2.08, 0.55], "#33453d", 0.005);
  for (const y of [-1.84, 1.84])
    for (const x of [-1.24, 1.24]) cylinder(chassis, 0.027, 0.015, [x, y, 0.93], "#727d75");

  const board = group("motherboard");
  box(board, [1.88, 2.75, 0.085], [-0.18, 0.4, -0.7], "#28483d", 0.035);
  box(board, [0.32, 1.15, 0.25], [-0.98, 0.95, -0.51], "#515d51", 0.025, 0.7);
  for (let i = 0; i < 9; i++)
    box(board, [0.016, 1.08, 0.02], [-1.1 + i * 0.034, 0.95, -0.37], "#a1a99c", 0.002, 0.6);
  box(board, [0.7, 0.22, 0.1], [-0.39, 1.59, -0.57], "#485c50");
  for (let i = 0; i < 10; i++)
    box(board, [0.026, 0.16, 0.02], [-0.69 + i * 0.065, 1.59, -0.51], "#b8b6a0", 0.001, 0.5);
  for (let i = 0; i < 8; i++) {
    const x = -0.88 + (i % 4) * 0.41;
    const y = -0.45 + Math.floor(i / 4) * 0.35;
    box(board, [0.19, 0.13, 0.05], [x, y, -0.63], "#172c23", 0.008);
    box(board, [0.007, 0.34, 0.006], [x + 0.13, y + 0.1, -0.65], "#719983", 0.001);
  }
  for (const x of [-1, 0.64])
    for (const y of [-0.78, 1.61]) cylinder(board, 0.035, 0.02, [x, y, -0.64], "#d1be7c");
  box(board, [1.3, 0.085, 0.1], [-0.25, -0.57, -0.58], "#dccb91", 0.005);
  cylinder(board, 0.12, 0.035, [-0.68, -0.16, -0.61], "#bcc5bd");

  const cpu = group("cpu");
  box(cpu, [0.76, 0.76, 0.065], [-0.31, 0.93, -0.59], "#192b22");
  box(cpu, [0.64, 0.64, 0.13], [-0.31, 0.93, -0.49], "#a69bb6", 0.04, 0.6);
  box(cpu, [0.48, 0.48, 0.02], [-0.31, 0.93, -0.41], "#d2cadb", 0.045, 0.7);
  for (let i = 0; i < 3; i++)
    box(cpu, [0.18 - i * 0.035, 0.018, 0.005], [-0.31, 1.02 - i * 0.065, -0.395], "#575265", 0.001);
  // The CPU is exposed intentionally so it is visible/selectable in this category cutaway.

  const ram = group("ram");
  for (const x of [0.24, 0.48]) {
    box(ram, [0.13, 1.05, 0.17], [x, 0.94, -0.5], "#283b29", 0.015);
    box(ram, [0.15, 1.07, 0.08], [x, 0.94, -0.37], "#c0ce75", 0.025, 0.2);
    box(ram, [0.08, 0.85, 0.025], [x, 0.94, -0.32], "#e0e6ac", 0.01);
    for (const y of [0.42, 1.47]) box(ram, [0.2, 0.08, 0.21], [x, y, -0.49], "#c3c5ab", 0.008);
  }

  const gpu = group("gpu");
  box(gpu, [2.05, 0.72, 0.52], [-0.17, -0.45, -0.01], "#eb633b", 0.06, 0.15);
  box(gpu, [2.08, 0.06, 0.6], [-0.17, -0.04, -0.05], "#c4b9a0", 0.01, 0.65);
  box(gpu, [2.12, 0.06, 0.58], [-0.17, -0.85, -0.05], "#4f5850", 0.015, 0.6);
  for (let i = 0; i < 23; i++)
    box(gpu, [0.025, 0.68, 0.03], [-1.12 + i * 0.082, -0.45, 0.28], "#c74c29", 0.001);
  for (const x of [-0.8, -0.16, 0.48]) fan(gpu, [x, -0.43, 0.33], 0.255, "#eeb798");
  box(gpu, [0.08, 0.86, 0.67], [-1.23, -0.43, -0.04], "#788377", 0.01, 0.6);
  cable(
    gpu,
    [
      [0.82, -0.45, 0.22],
      [0.95, -0.57, 0.4],
      [0.92, -1.05, 0.2],
      [0.57, -1.35, -0.3],
    ],
    "#333a31",
    0.06,
  );

  const cooling = group("cooling");
  for (const y of [-0.74, 0.38, 1.5]) fan(cooling, [1.33, y, 0], 0.43, "#9fb5af", true);
  // Rear exhaust is raised clear of the socket in this open-side illustration.
  fan(cooling, [-0.72, 1.35, -0.85], 0.3, "#c6c3af");

  const storage = group("storage");
  box(storage, [0.5, 0.82, 0.15], [0.48, -1.32, 0.56], "#d8a65a", 0.04, 0.2);
  box(storage, [0.39, 0.37, 0.015], [0.48, -1.27, 0.647], "#f4e2b9", 0.012);
  for (let i = 0; i < 4; i++)
    box(storage, [0.2, 0.016, 0.01], [0.48, -1.17 - i * 0.07, 0.66], "#796742", 0.001);
  cable(
    storage,
    [
      [0.48, -1.68, 0.55],
      [0.48, -1.84, 0.45],
      [0.68, -1.81, -0.5],
    ],
    "#5d6250",
  );

  const power = group("power");
  box(power, [2.15, 0.72, 1.45], [-0.11, -1.52, -0.09], "#36443b", 0.045);
  box(power, [0.9, 0.32, 0.02], [-0.47, -1.45, 0.65], "#4f6053", 0.02);
  for (let i = 0; i < 9; i++)
    box(power, [0.025, 0.22, 0.02], [-0.84 + i * 0.084, -1.45, 0.67], "#1c2f25", 0.003);
  cable(
    power,
    [
      [-0.93, -1.15, -0.1],
      [-1.02, -0.7, 0.2],
      [-1.05, 0.15, -0.25],
      [-0.75, 0.3, -0.55],
    ],
    "#27372c",
    0.04,
  );

  const anchors: Record<PcPartId, THREE.Vector3> = {
    gpu: new THREE.Vector3(-0.17, -0.43, 0.68),
    cpu: new THREE.Vector3(-0.31, 0.94, -0.38),
    ram: new THREE.Vector3(0.24, 1.2, -0.28),
    motherboard: new THREE.Vector3(-0.85, 0.15, -0.57),
    storage: new THREE.Vector3(0.48, -1.28, 0.67),
    cooling: new THREE.Vector3(1.44, 1.49, 0.1),
    power: new THREE.Vector3(-0.55, -1.48, 0.68),
    case: new THREE.Vector3(-1.24, 1.8, 0.88),
  };
  return {
    root,
    parts,
    materials,
    anchors,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materialCache.forEach((m) => m.dispose());
    },
  };
}
