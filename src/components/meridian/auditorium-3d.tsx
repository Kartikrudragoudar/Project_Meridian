"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  AUDITORIUM,
  buildAllSeats,
  getSeatPosition,
  type SeatData,
} from "@/lib/cinema";
import { useMeridian } from "@/store/meridian-store";
import { CinemaScreen } from "./cinema-screen";
import { Seat3D } from "./seat-3d";

const ALL_SEATS: SeatData[] = buildAllSeats();

/** Camera target positions, computed from store. */
function useCameraTargets() {
  const rowIndex = useMeridian((s) => s.rowIndex);
  const colIndex = useMeridian((s) => s.colIndex);
  const phase = useMeridian((s) => s.cameraPhase);
  const yaw = useMeridian((s) => s.yaw);
  const pitch = useMeridian((s) => s.pitch);

  return useMemo(() => {
    const seat = getSeatPosition(rowIndex, colIndex);
    const overviewPos = new THREE.Vector3(0, 26, 26);
    const overviewLook = new THREE.Vector3(0, 2, 10);
    const seatPos = new THREE.Vector3(seat.x, seat.y, seat.z);

    if (phase === "overview") {
      return { pos: overviewPos, look: overviewLook, seatPos };
    }

    // Seat phase: apply drag yaw/pitch to look direction.
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const dir = new THREE.Vector3(
      Math.sin(yawRad),
      Math.tan(pitchRad),
      -Math.cos(yawRad)
    ).normalize();
    // Sit the camera a touch behind the seat so we can see the seat we're in.
    const camPos = seatPos.clone().add(new THREE.Vector3(0, 0.18, 0.55));
    // The look target is a few meters ahead along the (yawed) direction.
    const lookTarget = camPos.clone().add(dir.clone().multiplyScalar(7));
    return { pos: camPos, look: lookTarget, seatPos };
  }, [rowIndex, colIndex, phase, yaw, pitch]);
}

/** Camera rig that lerps every frame to the computed target (factor 0.06). */
function CameraRig() {
  const { camera } = useThree();
  const targets = useCameraTargets();
  const lookTarget = useRef(new THREE.Vector3(0, 2, 10));
  const posTarget = useRef(new THREE.Vector3(0, 26, 26));

  useFrame(() => {
    posTarget.current.lerp(targets.pos, 0.06);
    lookTarget.current.lerp(targets.look, 0.06);
    camera.position.copy(posTarget.current);
    camera.lookAt(lookTarget.current);
  });

  return null;
}

interface DragControllerProps {
  onDragYaw: (delta: number) => void;
  onDragPitch: (delta: number) => void;
}

/** Captures pointer drag events on the canvas (touch + mouse). */
function DragController({ onDragYaw, onDragPitch }: DragControllerProps) {
  const { gl } = useThree();
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !last.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      onDragYaw(dx * 0.4);
      onDragPitch(-dy * 0.35);
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      last.current = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl, onDragYaw, onDragPitch]);

  return null;
}

/** Stepped floor tiers with glowing amber aisle step-lights. */
function StadiumFloor() {
  const stepLightRefs = useRef<(THREE.PointLight | null)[]>([]);

  useFrame(() => {
    const t = performance.now() / 1000;
    stepLightRefs.current.forEach((l, i) => {
      if (!l) return;
      l.intensity = 1.6 + Math.sin(t * 1.2 + i * 0.4) * 0.4;
    });
  });

  // Build tiers — one per row, using seat Z and Y of a mid-row seat.
  const tiers = Array.from({ length: AUDITORIUM.rows }, (_, i) => {
    const seat = getSeatPosition(i, 7);
    const halfWidth = 9.2;
    return {
      rowIndex: i,
      y: seat.y - 0.6,
      z: seat.z,
      halfWidth,
    };
  });

  return (
    <group>
      {tiers.map((tier, i) => (
        <group key={tier.rowIndex} position={[0, tier.y, tier.z]}>
          {/* Tier floor */}
          <mesh position={[0, -0.01, 0]}>
            <boxGeometry args={[tier.halfWidth * 2, 0.08, 1.5]} />
            <meshStandardMaterial
              color="#101015"
              metalness={0.5}
              roughness={0.7}
            />
          </mesh>
          {/* Step riser */}
          <mesh position={[0, -0.35, -0.7]}>
            <boxGeometry args={[tier.halfWidth * 2, 0.7, 0.05]} />
            <meshStandardMaterial
              color="#08080B"
              metalness={0.4}
              roughness={0.8}
            />
          </mesh>
          {/* Left aisle step-light strip */}
          <mesh position={[-tier.halfWidth + 0.1, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.02, 1.4]} />
            <meshStandardMaterial
              color="#F5A623"
              emissive="#F5A623"
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
          {/* Right aisle step-light strip */}
          <mesh position={[tier.halfWidth - 0.1, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.02, 1.4]} />
            <meshStandardMaterial
              color="#F5A623"
              emissive="#F5A623"
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
          {/* Subtle amber point lights at each aisle */}
          <pointLight
            ref={(l) => {
              stepLightRefs.current[i * 2] = l;
            }}
            position={[-tier.halfWidth + 0.1, 0.2, 0]}
            color="#F5A623"
            intensity={1.6}
            distance={3.5}
          />
          <pointLight
            ref={(l) => {
              stepLightRefs.current[i * 2 + 1] = l;
            }}
            position={[tier.halfWidth - 0.1, 0.2, 0]}
            color="#F5A623"
            intensity={1.6}
            distance={3.5}
          />
        </group>
      ))}
    </group>
  );
}

/** Dark ribbed acoustic side walls + back wall + floor + ceiling. */
function SideWalls() {
  const ribs = useMemo(() => {
    const items: { x: number; z: number; h: number }[] = [];
    const halfWidth = 9.3;
    for (let z = 4; z < 22; z += 0.7) {
      const h = 6.5 - (z - 4) * 0.18;
      items.push({ x: -halfWidth, z, h });
      items.push({ x: halfWidth, z, h });
    }
    return items;
  }, []);

  return (
    <group>
      {ribs.map((r, i) => (
        <mesh key={i} position={[r.x, r.h / 2 + 0.05, r.z]}>
          <boxGeometry args={[0.1, r.h, 0.4]} />
          <meshStandardMaterial
            color="#080A0E"
            metalness={0.3}
            roughness={0.85}
          />
        </mesh>
      ))}
      {/* Back wall */}
      <mesh position={[0, 4.5, 22]}>
        <boxGeometry args={[20, 9, 0.2]} />
        <meshStandardMaterial color="#05060A" metalness={0.4} roughness={0.85} />
      </mesh>
      {/* Floor under seats */}
      <mesh
        position={[0, -0.55, 13]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[20, 30]} />
        <meshStandardMaterial color="#0A0A0E" metalness={0.2} roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 9.5, 13]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 30]} />
        <meshStandardMaterial color="#08080C" metalness={0.3} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Stadium of seats. */
function SeatStadium({
  selectedKey,
  hoveredKey,
  onHover,
  onSelect,
}: {
  selectedKey: string;
  hoveredKey: string | null;
  onHover: (key: string | null) => void;
  onSelect: (seat: SeatData) => void;
}) {
  return (
    <group>
      {ALL_SEATS.map((seat) => {
        const key = `${seat.rowIndex}-${seat.colIndex}`;
        const isHovered = key === hoveredKey;
        const isSelected = key === selectedKey;
        return (
          <group
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              if (seat.status === "available") onSelect(seat);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(key);
              document.body.style.cursor =
                seat.status === "available" ? "pointer" : "default";
            }}
            onPointerOut={() => {
              onHover(null);
              document.body.style.cursor = "default";
            }}
          >
            <Seat3D
              seat={seat}
              selected={isSelected}
              hovered={isHovered}
            />
          </group>
        );
      })}
    </group>
  );
}

interface SceneProps {
  hoveredKey: string | null;
  setHoveredKey: (k: string | null) => void;
  onDragYaw: (delta: number) => void;
  onDragPitch: (delta: number) => void;
  onSelectSeat: (seat: SeatData) => void;
}

function AuditoriumScene({
  hoveredKey,
  setHoveredKey,
  onDragYaw,
  onDragPitch,
  onSelectSeat,
}: SceneProps) {
  const rowIndex = useMeridian((s) => s.rowIndex);
  const colIndex = useMeridian((s) => s.colIndex);
  const selectedKey = `${rowIndex}-${colIndex}`;

  return (
    <>
      <CameraRig />
      <DragController onDragYaw={onDragYaw} onDragPitch={onDragPitch} />
      <ambientLight intensity={0.7} color="#8A9AB8" />
      <hemisphereLight args={["#2A3854", "#0A0A0C", 0.6]} />
      {/* Cool overhead fill from above-back, gives seats their form */}
      <directionalLight
        position={[0, 14, 22]}
        intensity={0.7}
        color="#9BB7D4"
      />
      {/* Warm bounce light from screen area */}
      <pointLight
        position={[0, 3, 4]}
        intensity={5}
        distance={25}
        color="#F5A623"
      />
      <CinemaScreen />
      <StadiumFloor />
      <SideWalls />
      <SeatStadium
        selectedKey={selectedKey}
        hoveredKey={hoveredKey}
        onHover={setHoveredKey}
        onSelect={onSelectSeat}
      />
    </>
  );
}

interface Auditorium3DProps {
  onDragYaw: (delta: number) => void;
  onDragPitch: (delta: number) => void;
  onSelectSeat: (seat: SeatData) => void;
}

export function Auditorium3D({
  onDragYaw,
  onDragPitch,
  onSelectSeat,
}: Auditorium3DProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <Canvas
      className="!absolute inset-0"
      style={{ touchAction: "none" }}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 26, 26] }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0A0A0C"]} />
      <fog attach="fog" args={["#0A0A0C", 22, 60]} />
      <AuditoriumScene
        hoveredKey={hoveredKey}
        setHoveredKey={setHoveredKey}
        onSelectSeat={onSelectSeat}
        onDragYaw={onDragYaw}
        onDragPitch={onDragPitch}
      />
    </Canvas>
  );
}
