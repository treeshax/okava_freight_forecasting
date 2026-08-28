import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { sampleWater } from "./waves";

const MODEL_URL = `${import.meta.env.BASE_URL}models/cruiser.glb`;

// Target on-screen length of the vessel in scene units.
const SHIP_LENGTH = 24;

/**
 * The Cruisership 2012 model (single rigid mesh — "non movable parts", so all
 * motion is applied to the transform, never to internal geometry).
 *
 * Buoyancy: the hull is sampled against the shared Gerstner field at four
 * offsets so heave, pitch and roll stay loosely locked to the real wave
 * surface. A slow sway + heading wobble + the scrolling ocean + the wake
 * sell forward travel without the model ever leaving the frame.
 */
export default function Ship({ wakeRef }) {
  const outer = useRef(); // world placement (sway + heave)
  const inner = useRef(); // wave tilt (pitch + roll)
  const { scene } = useGLTF(MODEL_URL, false);

  const model = useMemo(() => {
    const root = scene.clone(true);

    // Measure the model in its own units (identity transform at this point).
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = SHIP_LENGTH / Math.max(size.x, size.z);

    // Scale first, then translate by the *scaled* centre so the hull ends up
    // centred on the origin regardless of the model's internal node scales
    // (the meshopt/quantise step bakes a different scale into every mesh).
    root.scale.setScalar(scale);
    root.position.copy(center).multiplyScalar(-scale);

    // raise the hull so the waterline cuts a realistic draft, not the mid-hull
    root.position.y += size.y * scale * 0.2;
    // model is authored with the stern at +X and the bow at -X (kept as-is:
    // the vessel travels toward -X, wake trails off toward +X)

    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const m = o.material;
      if (m && m.isMeshStandardMaterial) {
        // pull the stock daylight textures toward the night / amber palette
        m.color.multiplyScalar(0.55);
        m.color.lerp(new THREE.Color("#3b3350"), 0.25);
        m.metalness = 0.35;
        m.roughness = 0.72;
        m.envMapIntensity = 0.4;
      }
    });
    return root;
  }, [scene]);

  // half-length / half-beam of the (scaled) hull for buoyancy sampling
  const dims = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const s = new THREE.Vector3();
    box.getSize(s);
    return { halfLen: s.x / 2, halfBeam: s.z / 2 };
  }, [model]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!outer.current || !inner.current) return;

    // gentle sway around the origin (never drifts out of frame)
    const swayX = Math.sin(t * 0.12) * 1.6;
    const swayZ = Math.cos(t * 0.09) * 0.8;
    const heading = Math.sin(t * 0.05) * 0.06; // slow yaw wobble

    // heave from the wave field at the hull centre
    const c = sampleWater(swayX, swayZ, t);

    // pitch: bow vs stern height difference
    const bow = sampleWater(swayX + dims.halfLen * 0.8, swayZ, t).height;
    const stern = sampleWater(swayX - dims.halfLen * 0.8, swayZ, t).height;
    const pitch = Math.atan2(stern - bow, dims.halfLen * 1.6);

    // roll: port vs starboard height difference
    const port = sampleWater(swayX, swayZ + dims.halfBeam * 0.9, t).height;
    const star = sampleWater(swayX, swayZ - dims.halfBeam * 0.9, t).height;
    const roll = Math.atan2(port - star, dims.halfBeam * 1.8);

    outer.current.position.set(swayX, c.height * 0.55, swayZ);
    outer.current.rotation.y = heading;

    inner.current.rotation.x = pitch * 0.4;
    inner.current.rotation.z = roll * 0.5 + Math.sin(t * 0.5) * 0.005;

    if (wakeRef?.current) {
      wakeRef.current.position.set(swayX, 0.02, swayZ);
      wakeRef.current.rotation.y = heading;
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <primitive object={model} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL, false);
