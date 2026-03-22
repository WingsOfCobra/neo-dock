/* ── Particles – sparse floating motes (themed) ──────────────── */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 400;
const SPREAD = 30;

interface ParticlesProps {
  primary: string;
  primaryDim: string;
  accent: string;
}

export function Particles({ primary, primaryDim, accent }: ParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < COUNT; i++) {
      arr.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * SPREAD,
          (Math.random() - 0.5) * SPREAD * 0.6,
          (Math.random() - 0.5) * SPREAD,
        ),
        speed: 0.02 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  // Update colors when theme changes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const bright = new THREE.Color(primary);
    const dim = new THREE.Color(primaryDim);
    const hot = new THREE.Color(accent);
    for (let i = 0; i < COUNT; i++) {
      const r = Math.random();
      mesh.setColorAt(i, r > 0.6 ? bright : r > 0.3 ? dim : hot);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [primary, primaryDim, accent]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i]!;
      dummy.position.set(
        p.position.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.position.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.3,
        p.position.z + Math.sin(t * p.speed * 0.5 + p.phase * 2) * 0.4,
      );
      dummy.scale.setScalar(0.015 + Math.sin(t + p.phase) * 0.005);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.6} toneMapped={false} />
    </instancedMesh>
  );
}
