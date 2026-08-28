import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Shader-based bow wake / Kelvin trail. A flat strip pinned to the water just
 * behind the hull; a diverging V of foam plus centreline churn scroll backward
 * and fade out, so the ship reads as displacing water rather than floating on it.
 * Local +X is the ship's forward direction.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uFoam;
  uniform vec3  uAmber;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  void main(){
    // s: 0 at the stern (low X edge of the strip), 1 at the far tail
    float s = vUv.x;
    float off = abs(vUv.y - 0.5);

    // diverging Kelvin V
    float edge = abs(off - s * 0.34);
    float vFoam = smoothstep(0.06, 0.0, edge) * smoothstep(1.0, 0.05, s);

    // turbulent prop wash along the centreline near the stern
    float wash = smoothstep(0.34, 0.0, off) * smoothstep(0.55, 0.0, s);

    vec2 flow = vec2(s * 6.0 + uTime * 1.6, vUv.y * 8.0);
    float turb = fbm(flow) * 0.65 + 0.35;

    float foam = (vFoam + wash) * turb;
    foam *= smoothstep(0.0, 0.1, s);       // fade right at the hull
    foam *= 1.0 - smoothstep(0.55, 1.0, s); // fade the tail

    vec3 col = mix(uAmber, uFoam, 0.7);
    gl_FragColor = vec4(col, clamp(foam, 0.0, 1.0) * 0.5);
    #include <colorspace_fragment>
  }
`;

const Wake = forwardRef(function Wake(_props, ref) {
  const matRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFoam: { value: new THREE.Color("#E7DCC4") },
      uAmber: { value: new THREE.Color("#D9A441") },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2} position={[26, 0, 0]}>
        <planeGeometry args={[64, 22, 1, 1]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
});

export default Wake;
