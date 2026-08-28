import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WAVES } from "./waves";

/**
 * Custom GLSL ocean: layered Gerstner waves in the vertex stage, Fresnel-based
 * reflectivity + amber specular + crest foam + sparkle in the fragment stage.
 * Tinted to the Charter-IQ near-black / deep-purple palette (no ocean blue).
 */

const MAX_WAVES = 4;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2  uDir[${MAX_WAVES}];
  uniform float uAmp[${MAX_WAVES}];
  uniform float uLen[${MAX_WAVES}];
  uniform float uSpeed[${MAX_WAVES}];
  uniform float uSteep[${MAX_WAVES}];

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  const float G = 9.81;

  void main() {
    vec3 pos = position;
    vec3 nrm = vec3(0.0, 1.0, 0.0);
    float crest = 0.0;

    for (int i = 0; i < ${MAX_WAVES}; i++) {
      vec2 d = normalize(uDir[i]);
      float k = 6.28318530718 / uLen[i];
      float c = sqrt(G / k) * uSpeed[i];
      float f = k * dot(d, position.xz) - c * uTime;
      float a = uAmp[i];
      float q = uSteep[i] / (k * a * float(${MAX_WAVES}));

      pos.x += q * a * d.x * cos(f);
      pos.z += q * a * d.y * cos(f);
      pos.y += a * sin(f);

      float wa = k * a;
      nrm.x -= d.x * wa * cos(f);
      nrm.z -= d.y * wa * cos(f);
      nrm.y -= q * wa * sin(f);

      crest += a * sin(f);
    }

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    vNormal = normalize(nrm);
    vCrest = crest;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uCameraPos;
  uniform vec3  uLightDir;    // toward the amber key light
  uniform vec3  uDeepColor;
  uniform vec3  uSurfaceColor;
  uniform vec3  uAmberColor;
  uniform vec3  uSpecColor;
  uniform vec3  uFogColor;
  uniform float uFogDensity;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  // cheap hash noise for sparkle
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uLightDir);

    // Fresnel: glancing angles reflect the (dark) sky, steep angles show depth
    float fres = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 3.0);

    vec3 water = mix(uDeepColor, uSurfaceColor, fres * 0.85);

    // amber specular glints off the wave facets
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 220.0);
    float broadSpec = pow(max(dot(N, H), 0.0), 24.0) * 0.25;

    // sparkle: high-frequency noise gated by the specular lobe
    float sparkle = step(0.72, noise(vWorldPos.xz * 3.5 + uTime * 0.35))
                  * pow(max(dot(N, H), 0.0), 8.0);

    // foam on the highest crests
    float foam = smoothstep(0.28, 0.6, vCrest)
               * (0.5 + 0.5 * noise(vWorldPos.xz * 1.4 - uTime * 0.6));

    vec3 col = water;
    col += uAmberColor * (spec * 1.6 + broadSpec);
    col += uSpecColor  * sparkle * 0.9;
    col = mix(col, mix(uAmberColor, uSpecColor, 0.5), foam * 0.35);

    // subtle rim of amber bounce light where normals face the light
    col += uAmberColor * pow(max(dot(N, L), 0.0), 2.0) * 0.06;

    // exponential-squared fog to match the scene and bury the horizon seam
    float dist = length(uCameraPos - vWorldPos);
    float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function Ocean({
  lightDir = [-0.55, 0.35, 0.4],
  fogColor = "#140C24",
  fogDensity = 0.019,
}) {
  const matRef = useRef();
  const camPos = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPos: { value: new THREE.Vector3() },
      uLightDir: { value: new THREE.Vector3(...lightDir) },
      uDir: { value: WAVES.map((w) => new THREE.Vector2(...w.dir)) },
      uAmp: { value: WAVES.map((w) => w.amp) },
      uLen: { value: WAVES.map((w) => w.length) },
      uSpeed: { value: WAVES.map((w) => w.speed) },
      uSteep: { value: WAVES.map((w) => w.steep) },
      uDeepColor: { value: new THREE.Color("#08050F") },
      uSurfaceColor: { value: new THREE.Color("#1B1030") },
      uAmberColor: { value: new THREE.Color("#D9A441") },
      uSpecColor: { value: new THREE.Color("#CBD3E6") },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogDensity: { value: fogDensity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock, camera }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.elapsedTime;
    camera.getWorldPosition(camPos);
    matRef.current.uniforms.uCameraPos.value.copy(camPos);
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
      <planeGeometry args={[700, 700, 240, 240]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
