import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Ocean from "./Ocean";
import Ship from "./Ship";
import Wake from "./Wake";
import { prefersReducedMotion } from "./webgl";

const AMBER = "#D9A441";
const FOG_COLOR = "#140C24";

/** Slow cinematic hold on the ship — a gentle drift + parallax, never a spin. */
function CinematicCamera({ still }) {
  const target = useRef(new THREE.Vector3(-1.5, 1.6, 0));
  const desired = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }) => {
    const t = still ? 0 : clock.elapsedTime;
    const x = 15.5 + Math.sin(t * 0.05) * 2.6;
    const y = 5.4 + Math.sin(t * 0.07 + 1.0) * 0.7;
    const z = 20 + Math.cos(t * 0.045) * 2.0;
    camera.position.lerp(desired.current.set(x, y, z), 0.02);
    target.current.y = 1.6 + Math.sin(t * 0.06) * 0.2;
    camera.lookAt(target.current);
  });

  return null;
}

export default function ShipHeroScene() {
  const wakeRef = useRef();
  const still = prefersReducedMotion();

  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
      }}
      camera={{ position: [15.5, 5.4, 20], fov: 40, near: 0.5, far: 400 }}
    >
      <color attach="background" args={[FOG_COLOR]} />
      <fogExp2 attach="fog" args={[FOG_COLOR, 0.02]} />

      {/* cool ambient / fill from the dark purple environment */}
      <ambientLight color="#2b2247" intensity={0.55} />
      <hemisphereLight
        color="#241638"
        groundColor="#07040d"
        intensity={0.5}
      />

      {/* dominant amber key / rim light */}
      <directionalLight
        color={AMBER}
        intensity={3.1}
        position={[-16, 10, 6]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* warm back rim to separate the hull from the fog */}
      <directionalLight color="#E8B877" intensity={1.1} position={[10, 6, -14]} />
      {/* amber "beacon" glow near the bow */}
      <pointLight color={AMBER} intensity={40} distance={46} position={[12, 4, 2]} />

      <CinematicCamera still={still} />

      <Suspense fallback={null}>
        <Ship wakeRef={wakeRef} />
      </Suspense>
      <Wake ref={wakeRef} />
      <Ocean lightDir={[-0.7, 0.35, 0.25]} fogColor={FOG_COLOR} fogDensity={0.02} />
    </Canvas>
  );
}
