/* ── useSound – procedural Web Audio API sound effects ──────── */

import { useCallback, useRef } from 'react';
import { useSoundStore } from '@/stores/soundStore';

type SoundName = 'click' | 'confirm' | 'error' | 'notification' | 'navigate' | 'toggle';

type OscType = OscillatorType;

interface Tone {
  freq: number;
  duration: number;
  type: OscType;
}

const SOUND_CATALOG: Record<SoundName, Tone[]> = {
  click: [
    { freq: 800, duration: 0.03, type: 'square' },
  ],
  confirm: [
    { freq: 600, duration: 0.05, type: 'square' },
    { freq: 900, duration: 0.05, type: 'square' },
  ],
  error: [
    { freq: 200, duration: 0.15, type: 'sawtooth' },
  ],
  notification: [
    { freq: 400, duration: 0.066, type: 'sine' },
    { freq: 600, duration: 0.066, type: 'sine' },
    { freq: 800, duration: 0.066, type: 'sine' },
  ],
  navigate: [
    { freq: 400, duration: 0.06, type: 'sine' }, // sweep — handled specially
  ],
  toggle: [
    { freq: 1000, duration: 0.05, type: 'sine' },
  ],
};

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playSound = useCallback(
    (name: SoundName) => {
      const { soundEnabled, volume } = useSoundStore.getState();
      if (!soundEnabled) return;

      const ctx = getCtx();
      const tones = SOUND_CATALOG[name];
      if (!tones) return;

      // Navigate is a frequency sweep, not discrete tones
      if (name === 'navigate') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
        return;
      }

      let offset = 0;
      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.freq, ctx.currentTime + offset);
        gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + tone.duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + tone.duration);
        offset += tone.duration;
      }
    },
    [getCtx],
  );

  return { playSound };
}
