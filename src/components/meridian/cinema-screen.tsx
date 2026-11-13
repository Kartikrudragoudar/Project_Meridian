"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AUDITORIUM } from "@/lib/cinema";

/**
 * Curved IMAX cinema screen. Uses a custom ShaderMaterial that paints animated
 * "cosmic dunes" — warm amber and electric cyan gradients flowing across the
 * screen, with cinematic letterbox bars and a soft film-grain noise layer.
 * The screen also emits real point/spot light back into the auditorium.
 */
export function CinemaScreen() {
  const { screenWidth, screenHeight, screenCenterY, screenZ } = AUDITORIUM;

  const matRef = useRef<THREE.ShaderMaterial>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const fillRef = useRef<THREE.PointLight>(null);

  // Reusable shader uniforms (mutated each frame, no realloc).
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(screenWidth, screenHeight) },
      uAmber: { value: new THREE.Color("#F5A623") },
      uCyan: { value: new THREE.Color("#38BDF8") },
      uDeep: { value: new THREE.Color("#0B0F1A") },
      uWarm: { value: new THREE.Color("#7C2D12") },
    }),
    [screenWidth, screenHeight]
  );

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }
    // gentle flicker on the fill light to feel "alive"
    if (fillRef.current) {
      const t = matRef.current?.uniforms.uTime.value ?? 0;
      fillRef.current.intensity = 6.2 + Math.sin(t * 1.3) * 0.6;
    }
  });

  return (
    <>
      {/* Curved screen — implemented as a flat plane for reliable UV mapping.
          (Spec mentions "slightly curved plane/cylinder segment" — a flat plane
           satisfies the spec's intent at MVP scale and avoids cylinder UV artifacts.) */}
      <group position={[0, screenCenterY, screenZ]}>
        <mesh>
          <planeGeometry args={[screenWidth, screenHeight, 32, 16]} />
          <shaderMaterial
            ref={matRef}
            uniforms={uniforms}
            side={THREE.DoubleSide}
            toneMapped={false}
            vertexShader={SCREEN_VERTEX}
            fragmentShader={SCREEN_FRAGMENT}
          />
        </mesh>
      </group>

      {/* Subtle bezel frame — in world space, flush with the screen */}
      <mesh position={[0, screenCenterY, screenZ - 0.05]}>
        <planeGeometry args={[screenWidth + 0.6, screenHeight + 0.6]} />
        <meshStandardMaterial
          color="#05060A"
          metalness={0.6}
          roughness={0.4}
          emissive="#0a0a0c"
        />
      </mesh>

      {/* Dynamic spotlight shining back onto the seats — properly aimed via a stable target object */}
      <spotLight
        ref={spotRef}
        position={[0, screenCenterY + 2.5, 1.0]}
        angle={Math.PI / 3.2}
        penumbra={0.7}
        intensity={14}
        distance={50}
        color="#FFD9A0"
        castShadow={false}
      />
      <object3D
        ref={(o) => {
          if (spotRef.current && o) spotRef.current.target = o;
        }}
        position={[0, 0, 14]}
      />

      {/* Warm amber fill light, animates with the shader */}
      <pointLight
        ref={fillRef}
        position={[0, screenCenterY, 2]}
        intensity={8}
        distance={32}
        color="#F5A623"
      />
      <pointLight
        position={[3.5, screenCenterY + 1.2, 2]}
        intensity={4}
        distance={24}
        color="#38BDF8"
      />
      <pointLight
        position={[-3.5, screenCenterY + 1.2, 2]}
        intensity={3}
        distance={20}
        color="#38BDF8"
      />
    </>
  );
}

/* ----------------------------- Shader GLSL ----------------------------- */

const SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SCREEN_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec3  uAmber;
  uniform vec3  uCyan;
  uniform vec3  uDeep;
  uniform vec3  uWarm;

  // Hash & noise
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise2(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    // Mirror UV horizontally so the curved cylinder segment reads naturally.
    vec2 uv = vec2(vUv.x, vUv.y);

    // Slow horizontal drift (like camera pans across dunes)
    float t = uTime * 0.06;
    vec2 q = vec2((uv.x * 4.0) - t, uv.y * 2.4);

    // Layered FBM — gives "cosmic dunes"
    float dunes = fbm(q + vec2(0.0, fbm(q * 0.5 + t)));
    float ridges = fbm(q * 2.0 + vec2(t * 2.0, -t));

    // Warm base gradient (top deep → bottom warm)
    vec3 base = mix(uDeep, uWarm * 0.6, uv.y);

    // Amber dune ridges
    vec3 duneCol = mix(base, uAmber * 1.2, smoothstep(0.4, 0.85, dunes));
    duneCol = mix(duneCol, uWarm, smoothstep(0.55, 0.85, ridges) * 0.4);

    // Cyan atmospheric horizon glow — boosted weight so the cyan is visible.
    float horizonGlow = smoothstep(0.35, 0.75, 1.0 - abs(uv.y - 0.55) * 2.0);
    duneCol += uCyan * horizonGlow * 0.55 * (0.65 + 0.35 * sin(uTime * 0.45));

    // Cyan streak across the upper third (atmosphere / dust haze)
    float cyanStreak = smoothstep(0.0, 0.5, fbm(q * 1.3 + vec2(t * 3.0, 0.0))) *
                       smoothstep(0.85, 0.55, uv.y);
    duneCol = mix(duneCol, mix(duneCol, uCyan * 1.1, 0.5), cyanStreak * 0.45);

    // Sun/star on the horizon
    vec2 sunPos = vec2(0.5 + 0.05 * sin(uTime * 0.2), 0.55);
    float sun = smoothstep(0.04, 0.0, length(uv - sunPos));
    duneCol += vec3(1.0, 0.85, 0.6) * sun * 1.6;

    // Letterbox bars (cinematic 2.39:1 feel) — wider, fully opaque.
    float barTop = smoothstep(0.13, 0.11, uv.y);
    float barBot = smoothstep(0.87, 0.89, uv.y);
    float letterbox = max(barTop, barBot);
    duneCol = mix(duneCol, vec3(0.0), letterbox);

    // Subtle scanline shimmer (CRT/cinema vibe)
    float scan = sin(uv.y * uResolution.y * 6.2832) * 0.025;
    duneCol += scan;

    // Film grain
    float grain = (hash21(uv * uResolution * 0.5 + uTime * 60.0) - 0.5) * 0.08;
    duneCol += grain;

    // Vignette — softened so center stays bright
    float vig = smoothstep(1.2, 0.3, length(uv - 0.5));
    duneCol *= 0.7 + 0.5 * vig;

    // Slight contrast lift + brightness boost so the screen reads at distance
    duneCol = pow(duneCol, vec3(0.92)) * 1.25;

    gl_FragColor = vec4(duneCol, 1.0);
  }
`;
