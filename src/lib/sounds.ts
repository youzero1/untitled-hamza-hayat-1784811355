let audioCtx: AudioContext | null = null;

export function getAudio(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Noise buffer helper
function makeNoise(ctx: AudioContext, dur: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

export type SoundName =
  | 'faah'
  | 'slowmoPickup'
  | 'doubleKickPickup'
  | 'powerupExpire'
  | 'asteroidLost'
  | 'lifeWarning'
  | 'gameOver'
  | 'uiClick'
  | 'newHighScore';

export function playSound(name: SoundName): void {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;

  switch (name) {
    case 'faah': {
      const dur = 0.9;
      // Breath burst
      const noise = makeNoise(ctx, 0.15);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.35, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'highpass';
      nFilter.frequency.value = 2000;
      noise.connect(nFilter).connect(nGain).connect(ctx.destination);
      noise.start(now);
      // Vocal layers
      [180, 360, 540].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'sawtooth' : idx === 1 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(f * 1.15, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + dur);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 6;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = f * 0.04;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(now); lfo.stop(now + dur);
        const g = ctx.createGain();
        const vol = idx === 0 ? 0.25 : idx === 1 ? 0.08 : 0.12;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.08);
        g.gain.linearRampToValueAtTime(vol * 0.9, now + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900;
        filter.Q.value = 3;
        osc.connect(filter).connect(g).connect(ctx.destination);
        osc.start(now + 0.05); osc.stop(now + dur);
      });
      break;
    }
    case 'slowmoPickup': {
      // Descending shimmer — two sine sweeping down
      [600, 800].forEach((startF, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startF, now + i * 0.05);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + i * 0.05); osc.stop(now + 0.55);
      });
      break;
    }
    case 'doubleKickPickup': {
      // Bright ascending arpeggio
      [330, 440, 660].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.2);
      });
      break;
    }
    case 'powerupExpire': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(g).connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.25);
      break;
    }
    case 'asteroidLost': {
      // Low thud + noise burst
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(g).connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.3);
      const noise = makeNoise(ctx, 0.2);
      const nG = ctx.createGain();
      nG.gain.setValueAtTime(0.3, now);
      nG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      noise.connect(lp).connect(nG).connect(ctx.destination);
      noise.start(now);
      break;
    }
    case 'lifeWarning': {
      // Two sharp beeps
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 880;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.15, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + offset); osc.stop(now + offset + 0.15);
      });
      break;
    }
    case 'gameOver': {
      // Descending minor chord
      [220, 262, 330].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 1.2);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + i * 0.05); osc.stop(now + 1.3);
      });
      break;
    }
    case 'uiClick': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g).connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.12);
      break;
    }
    case 'newHighScore': {
      // Triumphant fanfare
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.1, now + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.3);
      });
      break;
    }
  }
}

// Global sound event listener — wire once at app startup
let soundListenerAdded = false;
export function initSoundListener(): void {
  if (soundListenerAdded) return;
  soundListenerAdded = true;
  window.addEventListener('sound:play', (e) => {
    playSound((e as CustomEvent<SoundName>).detail);
  });
}
