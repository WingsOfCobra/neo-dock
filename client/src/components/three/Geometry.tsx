/* ── Geometry – wireframe polyhedra (red) ─────────────────── */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function WireframeShape({
  position,
  rotationSpeed,
  color,
  size,
  geometry,
}: {
  position: [number, number, number];
  rotationSpeed: [number, number, number];
  color: string;
  size: number;
  geometry: 'icosahedron' | 'octahedron';
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed[0] * delta;
      meshRef.current.rotation.y += rotationSpeed[1] * delta;
      meshRef.current.rotation.z += rotationSpeed[2] * delta;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      {geometry === 'icosahedron' ? (
        <icosahedronGeometry args={[size, 1]} />
      ) : (
        <octahedronGeometry args={[size, 0]} />
      )}
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.12}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Geometry() {
  return (
    <>
      <WireframeShape
        position={[-12, 4, -15]}
        rotationSpeed={[0.05, 0.08, 0.02]}
        color="#FF0033"
        size={3}
        geometry="icosahedron"
      />
      <WireframeShape
        position={[14, -2, -18]}
        rotationSpeed={[-0.03, 0.06, -0.04]}
        color="#990020"
        size={2.5}
        geometry="octahedron"
      />
    </>
  );
}
