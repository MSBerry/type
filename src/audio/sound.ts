type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const C: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx ??= new C();
  } catch {
    return null;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, ms: number, type: OscillatorType, volume: number, delayMs = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delayMs / 1000;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

/** 实时合成的音效，不需要音频文件 */
export const sfx = {
  key: () => tone(700, 45, 'triangle', 0.05),
  wrong: () => tone(200, 140, 'square', 0.035),
  pop: () => {
    tone(660, 70, 'sine', 0.08);
    tone(990, 90, 'sine', 0.06, 60);
  },
  cheer: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 160, 'triangle', 0.07, i * 110)),
};

export type SfxName = keyof typeof sfx;
