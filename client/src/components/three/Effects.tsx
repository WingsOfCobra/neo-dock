/* ── Effects – post-processing (chromatic aberration, vignette) */

import {
  EffectComposer,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';

const chromaticOffset = new Vector2(0.001, 0.0005);

export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        offset={0.25}
        darkness={0.8}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.04}
      />
    </EffectComposer>
  );
}
