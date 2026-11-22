/**
 * 텃밭 3매치 효과음.
 *
 * 파일 없이 브라우저 안에서 소리를 합성한다(Web Audio). 일레븐랩스로 만든 소리 파일이
 * /assets/3match/sfx/{이름}.mp3 에 있으면 그 파일을 먼저 쓰고, 없으면 합성음으로 낸다 -
 * scripts/gen-jewel-sfx.mjs 로 파일을 만들면 코드를 고치지 않고 소리만 바뀐다.
 *
 * 브라우저는 사용자가 한 번 누르기 전에는 소리를 못 내게 막는다. 첫 터치에서 깨운다.
 */

export type SfxName =
  | 'swap'
  | 'invalid'
  | 'pop'
  | 'land'
  | 'spawn'
  | 'merge'
  | 'clash'
  | 'dig'
  | 'stick'
  | 'fuse'
  | 'boom'
  | 'acornLaunch'
  | 'acornHit'
  | 'chime'
  | 'petal'
  | 'morph'
  | 'chirp'
  | 'ribbit'
  | 'win'
  | 'lose';

const MUTE_KEY = 'jk-sound-muted';
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* 저장 못 해도 이번 세션에서는 따른다 */
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    // 큰 폭발이 겹쳐도 찢어지지 않게 살짝 눌러 준다
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

/** 첫 터치에서 소리를 깨운다(브라우저 자동 재생 제한) */
export function unlockAudio(): void {
  const a = audio();
  if (a && a.state === 'suspended') void a.resume();
}

// ── 일레븐랩스 등으로 만든 파일이 있으면 그걸 쓴다 ──
const fileBuffers = new Map<SfxName, AudioBuffer | null>();
function loadFile(name: SfxName) {
  if (fileBuffers.has(name)) return;
  fileBuffers.set(name, null);
  const a = audio();
  if (!a) return;
  fetch(`/assets/3match/sfx/${name}.mp3`)
    .then(r => (r.ok && (r.headers.get('content-type') ?? '').includes('audio') ? r.arrayBuffer() : null))
    .then(buf => (buf ? a.decodeAudioData(buf) : null))
    .then(decoded => {
      if (decoded) fileBuffers.set(name, decoded);
    })
    .catch(() => {});
}

// ── 합성 재료 ──
let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

interface ToneOpts {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain: number;
  at?: number;
  attack?: number;
}

function tone(a: AudioContext, o: ToneOpts) {
  const t0 = a.currentTime + (o.at ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
  const atk = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(master!);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

interface NoiseOpts {
  dur: number;
  gain: number;
  type?: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
  at?: number;
  attack?: number;
}

function hiss(a: AudioContext, o: NoiseOpts) {
  const t0 = a.currentTime + (o.at ?? 0);
  const src = a.createBufferSource();
  src.buffer = noise(a);
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
  const g = a.createGain();
  const atk = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.02);
}

/** 살짝 일그러뜨려 힘을 주는 길(폭발용). 소리를 이 길로 보내면 더 단단하고 크게 들린다 */
let crunch: WaveShaperNode | null = null;
function crunchBus(a: AudioContext): AudioNode {
  if (!crunch) {
    crunch = a.createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    const k = 6;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    crunch.curve = curve;
    crunch.oversample = '2x';
    const g = a.createGain();
    g.gain.value = 0.7;
    crunch.connect(g).connect(master!);
  }
  return crunch;
}

/** 시원한 폭발: 타격음 + 저음 킥 + 쿵 몸통 + 흙 후드득 꼬리. size가 크면 더 묵직하고 길다 */
function explosion(a: AudioContext, size = 1) {
  const t0 = a.currentTime;
  const bus = crunchBus(a);
  // 1) 딱: 아주 짧고 밝은 타격(귀에 "터졌다"를 먼저 알린다)
  {
    const src = a.createBufferSource();
    src.buffer = noise(a);
    const f = a.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = a.createGain();
    g.gain.setValueAtTime(0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
    src.connect(f).connect(g).connect(bus);
    src.start(t0);
    src.stop(t0 + 0.05);
  }
  // 2) 저음 킥: 160Hz에서 38Hz로 확 떨어지며 배를 울린다
  {
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.28 * size);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55 * size);
    osc.connect(g).connect(bus);
    osc.start(t0);
    osc.stop(t0 + 0.6 * size);
  }
  // 3) 쿵 몸통: 넓게 퍼지는 저역 잡음이 닫히며 잦아든다
  {
    const src = a.createBufferSource();
    src.buffer = noise(a);
    src.loop = true;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(3200, t0);
    f.frequency.exponentialRampToValueAtTime(140, t0 + 0.5 * size);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.8, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7 * size);
    src.connect(f).connect(g).connect(bus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + 0.75 * size);
  }
  // 4) 흙 후드득: 흩어진 파편이 떨어지는 짧은 알갱이들
  for (let i = 0; i < Math.round(9 * size); i++) {
    hiss(a, {
      dur: 0.025 + Math.random() * 0.03,
      gain: 0.12 + Math.random() * 0.1,
      type: 'bandpass',
      from: 1200 + Math.random() * 2500,
      q: 2,
      at: 0.12 + Math.random() * 0.45 * size,
    });
  }
}

/** 소리 하나. pitch는 1이 기본(연쇄가 이어지면 올린다) */
export function playSfx(name: SfxName, pitch = 1): void {
  if (muted) return;
  const a = audio();
  if (!a || !master) return;
  if (a.state === 'suspended') void a.resume();
  loadFile(name);
  const file = fileBuffers.get(name);
  if (file) {
    const src = a.createBufferSource();
    src.buffer = file;
    src.playbackRate.value = pitch;
    src.connect(master);
    src.start();
    return;
  }
  const p = pitch;
  switch (name) {
    case 'swap':
      hiss(a, { dur: 0.14, gain: 0.25, from: 500, to: 2200, q: 1.2 });
      break;
    case 'invalid':
      tone(a, { type: 'triangle', from: 330, to: 180, dur: 0.22, gain: 0.35 });
      tone(a, { type: 'triangle', from: 250, to: 140, dur: 0.2, gain: 0.25, at: 0.09 });
      break;
    case 'pop':
      // 톡 터지는 즙: 짧은 물방울 + 아삭한 잡음
      tone(a, { from: 520 * p, to: 980 * p, dur: 0.09, gain: 0.45 });
      tone(a, { from: 980 * p, to: 420 * p, dur: 0.12, gain: 0.25, at: 0.03 });
      hiss(a, { dur: 0.06, gain: 0.18, type: 'highpass', from: 3500 });
      break;
    case 'land':
      tone(a, { from: 180, to: 90, dur: 0.08, gain: 0.18 });
      break;
    case 'spawn':
      [1568, 2093, 2637].forEach((f, i) => tone(a, { from: f, dur: 0.18, gain: 0.18, at: i * 0.05 }));
      break;
    case 'merge':
      hiss(a, { dur: 0.25, gain: 0.25, from: 2400, to: 400, q: 2 });
      tone(a, { from: 400, to: 1200, dur: 0.18, gain: 0.3, at: 0.18 });
      [1760, 2349].forEach((f, i) => tone(a, { from: f, dur: 0.2, gain: 0.15, at: 0.28 + i * 0.05 }));
      break;
    case 'clash':
      // 쨍: 서로 안 맞는 높은 음 여러 개가 길게 울린다(쇠끼리 부딪힘)
      [523, 1247, 1873, 2651, 3407].forEach((f, i) => tone(a, { type: 'sine', from: f, dur: 0.6 - i * 0.07, gain: 0.16 }));
      hiss(a, { dur: 0.05, gain: 0.35, type: 'highpass', from: 4000 });
      break;
    case 'dig':
      // 흙을 긁고 지나가는 소리
      hiss(a, { dur: 0.32, gain: 0.32, type: 'lowpass', from: 1400, to: 500, q: 0.8 });
      hiss(a, { dur: 0.18, gain: 0.2, from: 900, to: 2600, q: 1.5 });
      break;
    case 'stick':
      // 탕: 땅에 꽂힘
      tone(a, { from: 160, to: 70, dur: 0.16, gain: 0.5 });
      hiss(a, { dur: 0.08, gain: 0.3, type: 'lowpass', from: 1800 });
      tone(a, { type: 'triangle', from: 880, to: 700, dur: 0.12, gain: 0.08, at: 0.01 });
      break;
    case 'fuse':
      // 치지직: 심지 타는 소리(0.6초)
      hiss(a, { dur: 0.6, gain: 0.12, type: 'highpass', from: 3000, to: 6000, attack: 0.05 });
      for (let i = 0; i < 8; i++) hiss(a, { dur: 0.02, gain: 0.18, type: 'highpass', from: 5000, at: 0.05 + i * 0.07 + Math.random() * 0.03 });
      break;
    case 'boom':
      // 펑: pitch가 1보다 크면(무지개꽃 팡) 가볍고 짧게, 1이면 묵직하게, 1보다 작으면(큰 거름포대) 더 크고 길게
      explosion(a, p > 1.2 ? 0.7 : p < 0.9 ? 1.5 : 1);
      break;
    case 'acornLaunch':
      // 통: 튀어 오르는 소리
      tone(a, { type: 'triangle', from: 220, to: 660, dur: 0.16, gain: 0.35 });
      hiss(a, { dur: 0.15, gain: 0.12, from: 800, to: 2400, q: 1.5, at: 0.04 });
      break;
    case 'acornHit':
      // 딱: 나무 두드리는 소리
      tone(a, { type: 'triangle', from: 1050, to: 900, dur: 0.07, gain: 0.45 });
      tone(a, { type: 'sine', from: 1720, to: 1500, dur: 0.05, gain: 0.22 });
      hiss(a, { dur: 0.03, gain: 0.25, from: 2500, q: 2 });
      break;
    case 'chime':
      // 무지개꽃이 활짝: 반짝이는 올림 화음
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(a, { from: f, dur: 0.5, gain: 0.16, at: i * 0.06 }));
      break;
    case 'petal':
      // 꽃잎 하나 닿음: 맑은 딩(연쇄처럼 음이 올라간다)
      tone(a, { from: 1568 * p, dur: 0.28, gain: 0.2 });
      tone(a, { from: 3136 * p, dur: 0.15, gain: 0.07 });
      break;
    case 'morph':
      tone(a, { from: 700 * p, to: 1400 * p, dur: 0.12, gain: 0.3 });
      [2093, 2637].forEach((f, i) => tone(a, { from: f * p, dur: 0.15, gain: 0.12, at: 0.06 + i * 0.04 }));
      break;
    case 'chirp':
      tone(a, { from: 2600, to: 3800, dur: 0.07, gain: 0.2 });
      tone(a, { from: 2800, to: 4200, dur: 0.07, gain: 0.2, at: 0.1 });
      break;
    case 'ribbit':
      tone(a, { type: 'square', from: 180, to: 140, dur: 0.12, gain: 0.12 });
      tone(a, { type: 'square', from: 200, to: 150, dur: 0.14, gain: 0.12, at: 0.14 });
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, { type: 'triangle', from: f, dur: 0.35, gain: 0.28, at: i * 0.09 }));
      [1568, 2093].forEach((f, i) => tone(a, { from: f, dur: 0.6, gain: 0.14, at: 0.5 + i * 0.05 }));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(a, { type: 'triangle', from: f, to: f * 0.97, dur: 0.4, gain: 0.25, at: i * 0.18 }));
      break;
  }
}

/** ms 뒤에 소리(턴 연출 시간표에 맞춘다) */
export function playSfxAt(name: SfxName, ms: number, pitch = 1): void {
  if (muted) return;
  if (ms <= 0) playSfx(name, pitch);
  else window.setTimeout(() => playSfx(name, pitch), ms);
}
