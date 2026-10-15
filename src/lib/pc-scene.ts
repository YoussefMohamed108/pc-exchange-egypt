import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createPcModel } from "./pc-model";
import type { PcPartId } from "./pc-parts";

export type Projection = Record<PcPartId, { x: number; y: number; visible: boolean }>;
export type PcSceneController = {
  highlight: (id: PcPartId | null) => void;
  rotate: (direction: number) => void;
  reset: () => void;
  dispose: () => void;
};

export function mountPcScene(
  host: HTMLElement,
  callbacks: {
    onSelect: (id: PcPartId) => void;
    onHover: (id: PcPartId | null) => void;
    onProject: (positions: Projection) => void;
    onError: () => void;
  },
): PcSceneController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.pcCanvas = "true";
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 100);
  camera.position.set(4.5, 3.1, 8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, -0.08, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.8;
  controls.maxPolarAngle = 1.68;
  controls.minAzimuthAngle = -1;
  controls.maxAzimuthAngle = 1.4;
  controls.rotateSpeed = 0.6;
  controls.update();
  controls.saveState();
  canvas.style.touchAction = "pan-y";

  scene.add(new THREE.HemisphereLight(0xfff8eb, 0x667064, 3.1));
  const key = new THREE.DirectionalLight(0xfff5df, 5.5);
  key.position.set(-3, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.03;
  key.shadow.bias = -0.0001;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc6c4ff, 2.5);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  const model = createPcModel();
  scene.add(model.root);
  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const groundMaterial = new THREE.ShadowMaterial({ color: 0x383329, opacity: 0.11 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.255;
  ground.receiveShadow = true;
  scene.add(ground);
  let disposed = false,
    frame = 0,
    visible = true;
  let hovered: PcPartId | null = null;
  let start: { x: number; y: number; id: number } | null = null;
  let dragged = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  function render() {
    frame = 0;
    if (disposed || !visible) return;
    renderer.render(scene, camera);
    const positions = {} as Projection;
    for (const [id, anchor] of Object.entries(model.anchors)) {
      projected.copy(anchor).project(camera);
      pointer.set(projected.x, projected.y);
      raycaster.setFromCamera(pointer, camera);
      const firstPart = raycaster.intersectObject(model.root, true)[0]?.object.userData.part;
      positions[id as PcPartId] = {
        x: (projected.x + 1) * 50,
        y: (1 - projected.y) * 50,
        visible: projected.z > -1 && projected.z < 1 && firstPart === id,
      };
    }
    callbacks.onProject(positions);
  }
  function invalidate() {
    if (!frame && !disposed && visible) frame = requestAnimationFrame(render);
  }
  function highlight(id: PcPartId | null) {
    for (const [part, materials] of Object.entries(model.materials))
      for (const material of materials) {
        material.emissive.set(part === id ? 0xd67133 : 0x000000);
        material.emissiveIntensity = part === id ? 0.25 : 0;
      }
    invalidate();
  }
  function hit(event: PointerEvent): PcPartId | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const intersection = raycaster.intersectObject(model.root, true)[0];
    return (intersection?.object.userData.part as PcPartId | undefined) || null;
  }
  function move(event: PointerEvent) {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) dragged = true;
    if (dragged) {
      canvas.style.cursor = "grabbing";
      return;
    }
    const id = hit(event);
    canvas.style.cursor = id ? "pointer" : "grab";
    if (id !== hovered) {
      hovered = id;
      highlight(id);
      callbacks.onHover(id);
    }
  }
  function down(event: PointerEvent) {
    if (event.isPrimary && event.button === 0) {
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
      dragged = false;
    }
  }
  function up(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) return;
    const wasClick = !dragged && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6;
    start = null;
    dragged = false;
    if (wasClick) {
      const id = hit(event);
      if (id) callbacks.onSelect(id);
    }
    canvas.style.cursor = "grab";
  }
  function leave() {
    hovered = null;
    highlight(null);
    callbacks.onHover(null);
  }
  function cancel() {
    start = null;
    dragged = false;
    leave();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    callbacks.onError();
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("webglcontextlost", contextLost);
  controls.addEventListener("change", invalidate);
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height,
      viewHeight = aspect < 0.8 ? 6.8 : 5.85;
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    invalidate();
  });
  resize.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
  });
  observer.observe(host);
  invalidate();
  return {
    highlight,
    rotate(direction) {
      controls.rotateLeft((direction * Math.PI) / 9);
      controls.update();
      invalidate();
    },
    reset() {
      controls.reset();
      invalidate();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("webglcontextlost", contextLost);
      model.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
