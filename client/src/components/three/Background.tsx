/* ── Background – R3F canvas with red terminal scene ────────── */

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';
import { GridFloor } from './GridFloor';
import { Particles } from './Particles';
import { Geometry } from './Geometry';
import { Effects } from './Effects';

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useFrame(() => {
    const maxAngle = 0.035;
    target.current.x += (mouse.current.x * maxAngle - target.current.x) * 0.05;
    target.current.y += (-mouse.current.y * maxAngle - target.current.y) * 0.05;
    camera.rotation.y = target.current.x;
    camera.rotation.x = target.current.y;
  });

  return null;
}

export function Background() {
  const [visible, setVisible] = useState(true);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const handleVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    const canvas = gl.domElement;

    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };

    const onRestored = () => {
      setContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, []);

  if (contextLost) {
    return <div className="fixed inset-0 -z-10 bg-neo-bg-deep" />;
  }

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2, 8], fov: 60 }}
        frameloop={visible ? 'always' : 'demand'}
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          stencil: false,
          depth: true,
        }}
        onCreated={handleCreated}
      >
        <color attach="background" args={['#0A0000']} />
        <fog attach="fog" args={['#0A0000', 15, 45]} />
        <Suspense fallback={null}>
          <CameraRig />
          <GridFloor />
          <Particles />
          <Geometry />
          <Effects />
        </Suspense>
      </Canvas>
    </div>
  );
}
