export type SoundName =
  | "select"
  | "move"
  | "capture"
  | "castle"
  | "promote"
  | "check"
  | "checkmate"
  | "draw"
  | "start";

const MUTE_KEY = "chess:muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* storage unavailable – ignore */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    // A gentle compressor keeps stacked sounds (e.g. capture + check) from clipping.
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    // 0.25s of white noise, reused for every "wood" transient.
    const len = Math.floor(ctx.sampleRate * 0.25);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/** Call from a click/key handler so browsers allow audio playback. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

/* ---------- building blocks ---------- */

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  endFreq?: number;
  detune?: number;
}

/** A pitched note with a fast attack and exponential decay. */
function tone(
  freq: number,
  start: number,
  dur: number,
  opts: ToneOpts = {},
): void {
  const c = ctx!;
  const {
    type = "sine",
    gain = 0.3,
    attack = 0.005,
    endFreq,
    detune = 0,
  } = opts;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  osc.detune.value = detune;

  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/** Filtered noise burst – gives the percussive "click" of a piece landing. */
function noise(
  start: number,
  dur: number,
  opts: {
    freq?: number;
    q?: number;
    gain?: number;
    filter?: BiquadFilterType;
  } = {},
): void {
  const c = ctx!;
  const { freq = 1800, q = 1.2, gain = 0.3, filter = "bandpass" } = opts;

  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  src.connect(f).connect(g).connect(master!);
  src.start(start);
  src.stop(start + dur + 0.02);
}

/**
 * "Knock": a hollow wooden thud = a falling sine body + a bright noise tick.
 * `pitch` controls the size of the piece feel (lower = heavier).
 */
function knock(start: number, pitch = 220, gain = 0.8): void {
  tone(pitch, start, 0.11, { gain, endFreq: pitch * 0.45, attack: 0.002 });
  tone(pitch * 2.01, start, 0.05, {
    gain: gain * 0.25,
    endFreq: pitch * 1.2,
    attack: 0.002,
  });
  noise(start, 0.035, { freq: pitch * 8, q: 0.9, gain: gain * 0.45 });
}

/* ---------- the sounds ---------- */

const SOUNDS: Record<SoundName, (t: number) => void> = {
  // Tiny soft tick when picking up a piece
  select: (t) => {
    noise(t, 0.018, { freq: 3500, q: 2, gain: 0.12, filter: "highpass" });
    tone(920, t, 0.04, { gain: 0.05, type: "triangle" });
  },

  // Light wooden knock
  move: (t) => {
    knock(t, 230, 0.8);
  },

  // Heavier double-hit with a rattle of noise
  // Crisp, sharp double-click (like a piece snapping another piece off the board)
  capture: (t) => {
    // 1. Sharp high-frequency snap (the impact)
    noise(t, 0.04, { freq: 3500, q: 1.5, gain: 0.5 });

    // 2. A quick, high-pitched wooden knock
    tone(320, t, 0.05, { gain: 0.5, endFreq: 150, attack: 0.001 });

    // 3. A brief secondary "clack" just a millisecond later
    noise(t + 0.03, 0.05, { freq: 1800, q: 0.8, gain: 0.3 });
    tone(180, t + 0.03, 0.08, { gain: 0.4, endFreq: 80, attack: 0.001 });
  },

  // Two quick knocks – king, then rook
  castle: (t) => {
    knock(t, 225, 0.75);
    knock(t + 0.13, 270, 0.75);
  },

  // Knock followed by a bright rising sparkle
  promote: (t) => {
    knock(t, 210, 0.7);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, t + 0.1 + i * 0.065, 0.28, { type: "triangle", gain: 0.16 });
      tone(f * 2, t + 0.1 + i * 0.065, 0.15, { gain: 0.04 });
    });
  },

  // Knock + a sharp two-note alert ping
  check: (t) => {
    knock(t, 230, 0.75);
    tone(880, t + 0.09, 0.22, { type: "triangle", gain: 0.2 });
    tone(1174.66, t + 0.17, 0.4, { type: "triangle", gain: 0.22 });
    tone(1174.66, t + 0.17, 0.4, { gain: 0.08, detune: 7 });
  },

  // Heavy knock, a falling minor phrase and a low final drone
  checkmate: (t) => {
    knock(t, 150, 1.0);
    [392, 311.13, 261.63, 196].forEach((f, i) => {
      tone(f, t + 0.22 + i * 0.17, 0.6, { type: "triangle", gain: 0.2 });
      tone(f / 2, t + 0.22 + i * 0.17, 0.6, { gain: 0.1 });
    });
    tone(98, t + 0.85, 1.4, { gain: 0.28, attack: 0.05 });
    tone(146.83, t + 0.85, 1.4, { gain: 0.12, attack: 0.05 });
  },

  // Neutral, unresolved two-note sigh
  draw: (t) => {
    knock(t, 200, 0.6);
    tone(440, t + 0.2, 0.5, { type: "triangle", gain: 0.16 });
    tone(415.3, t + 0.5, 0.7, { type: "triangle", gain: 0.16 });
  },

  // Soft rising chord when a new game begins
  start: (t) => {
    [261.63, 329.63, 392, 523.25].forEach((f, i) => {
      tone(f, t + i * 0.07, 0.7, {
        type: "triangle",
        gain: 0.12,
        attack: 0.03,
      });
    });
    noise(t, 0.05, { freq: 2500, q: 1, gain: 0.08 });
  },
};

export function playSound(name: SoundName): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  try {
    SOUNDS[name](c.currentTime + 0.005);
  } catch {
    /* never let audio break the game */
  }
}
