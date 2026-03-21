/* ── Effects – post-processing (chromatic aberration, vignette) */

import {
  EffectComposer,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';

const chromaticOffset = new Vector2(0.0008, 0.0008);

export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        offset={0.3}
        darkness={0.7}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.03}
      />
    </EffectComposer>
  );
}
