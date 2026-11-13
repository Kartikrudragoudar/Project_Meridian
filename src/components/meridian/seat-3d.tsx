"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { SeatData } from "@/lib/cinema";

const AMBER = new THREE.Color("#F5A623");
const AVAILABLE = new THREE.Color("#54545E"); // brighter dark gray so seats read in dim cinema light
const AVAILABLE_HOVER = new THREE.Color("#7A7A88");
const OCCUPIED = new THREE.Color("#1A1A20");

interface Seat3DProps {
  seat: SeatData;
  selected: boolean;
  hovered: boolean;
}

/**
 * A single stadium seat: a slightly tilted backrest + cushion block on a
 * short pedestal. Highlighted amber when selected.
 *
 * Rendered at (seatX, seatY - 0.5, seatZ) per the spec.
 *
 * Uses inline R3F geometry elements (the safest pattern in @react-three/fiber
 * v9 / v10) — no shared geometry refs across instances.
 */
export function Seat3D({ seat, selected, hovered }: Seat3DProps) {
  const color = useMemo(() => {
    if (seat.status === "occupied") return OCCUPIED;
    if (selected) return AMBER;
    if (hovered) return AVAILABLE_HOVER;
    return AVAILABLE;
  }, [seat.status, selected, hovered]);

  const emissive = useMemo(() => {
    if (selected) return AMBER.clone().multiplyScalar(0.6);
    if (hovered) return new THREE.Color("#1A1A1F");
    return new THREE.Color("#0A0A0E");
  }, [selected, hovered]);

  const emissiveIntensity = selected ? 1.5 : hovered ? 0.6 : 0.3;

  const position: [number, number, number] = [
    seat.position.x,
    seat.position.y - 0.5, // spec: render at seatY - 0.5
    seat.position.z,
  ];

  return (
    <group position={position}>
      {/* Cushion */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.55, 0.12, 0.55]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      {/* Backrest (slightly tilted back) */}
      <mesh position={[0, 0.42, -0.22]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.55, 0.55, 0.1]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      {/* Pedestal */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.45, 6]} />
        <meshStandardMaterial
          color="#0F0F14"
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Selected seat glow halo (a faint ring under the seat) */}
      {selected && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.55, 32]} />
          <meshBasicMaterial
            color={AMBER}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {selected && (
        <pointLight
          position={[0, 0.3, 0]}
          intensity={1.2}
          distance={1.8}
          color="#F5A623"
        />
      )}
    </group>
  );
}
