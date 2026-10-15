import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createPcModel } from "../src/lib/pc-model";

describe("cutaway PC selection", () => {
  it("exposes a selectable surface for every component in the opening view", () => {
    const model = createPcModel();
    const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 100);
    camera.position.set(4.5, 3.1, 8);
    camera.lookAt(0, -0.08, 0);
    camera.updateMatrixWorld();
    model.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    try {
      for (const [id, point] of Object.entries(model.anchors)) {
        const screen = point.clone().project(camera);
        ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
        const firstVisibleSurface = ray.intersectObject(model.root, true)[0];
        expect(
          firstVisibleSurface?.object.userData.part,
          `${id} must not be blocked by the case or another part`,
        ).toBe(id);
      }
    } finally {
      model.dispose();
    }
  });
});
