/* ── GridFloor – scrolling wireframe grid (themed) ─────────── */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { Group } from 'three';

interface GridFloorProps {
  primary: string;
  primaryDim: string;
}

export function GridFloor({ primary, primaryDim }: GridFloorProps) {
  const groupRef = useRef<Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.z += delta * 2;
      if (groupRef.current.position.z > 10) {
        groupRef.current.position.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Grid
        args={[80, 80]}
        cellSize={1}
        cellColor={primary}
        cellThickness={0.4}
        sectionSize={5}
        sectionColor={primaryDim}
        sectionThickness={0.8}
        fadeDistance={40}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}
