// 카테고리 완성 효과음 — "시원하게 터지는" 팝 + 꽃가루 지글거림 + 반짝임을 합성해서 WAV로 저장한다.
// 실행: node scripts/generate-complete-sfx.mjs  →  public/assets/word-sort/sounds/complete.wav
import fs from 'fs';

const SR = 44100;
const DUR = 1.25;
const N = Math.floor(SR * DUR);
const buf = new Float32Array(N);
let seed = 20240607;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

// 1) 펑! — 피치가 빠르게 떨어지는 사인(몸통) + 짧은 노이즈 타격(어택)
{
    let phase = 0;
    for (let i = 0; i < Math.floor(SR * 0.3); i++) {
        const t = i / SR;
        const f = 85 + 420 * Math.exp(-t / 0.022);
        phase += 2 * Math.PI * f / SR;
        buf[i] += 0.95 * Math.sin(phase) * Math.exp(-t / 0.07);
        buf[i] += 0.75 * rnd() * Math.exp(-t / 0.011);
    }
}

// 2) 시원한 꽃가루 지글거림 — 고역 노이즈가 퍼지며 사라짐 + 듬성듬성한 딸깍 소리
{
    let prev = 0;
    for (let i = 0; i < Math.floor(SR * 0.95); i++) {
        const t = i / SR;
        const n = rnd();
        const hp = n - 0.9 * prev; prev = n;
        const swell = Math.min(1, t / 0.02) * Math.exp(-t / 0.24);
        buf[i] += 0.32 * hp * swell;
        if (Math.abs(rnd()) < 0.0035 * Math.exp(-t / 0.3)) {           // 터지는 알갱이
            const a = 0.55 * (0.4 + 0.6 * Math.abs(rnd()));
            for (let k = 0; k < 6 && i + k < N; k++) buf[i + k] += a * rnd() * Math.exp(-k / 1.6);
        }
    }
}

// 3) 반짝임 — 높은 종소리 3개를 빠르게 얹어서 밝고 시원한 끝맛
function bell(t0, freq, amp, tau) {
    const start = Math.floor(t0 * SR);
    for (let i = start; i < N; i++) {
        const t = (i - start) / SR;
        buf[i] += amp * Math.min(1, t / 0.002) * (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2.76 * t)) * Math.exp(-t / tau);
    }
}
bell(0.04, 2637, 0.16, 0.22);
bell(0.09, 3136, 0.14, 0.22);
bell(0.15, 4186, 0.11, 0.28);

// 소프트 클리핑으로 묵직하게, 끝 페이드 아웃, 정규화
const out = new Float32Array(N);
const drive = 1.8, norm = Math.tanh(drive);
for (let i = 0; i < N; i++) out[i] = Math.tanh(drive * buf[i]) / norm;
const fade = Math.floor(0.12 * SR);
for (let i = 0; i < fade; i++) out[N - 1 - i] *= i / fade;
let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const gain = 0.9 / peak;

const pcm = Buffer.alloc(44 + N * 2);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write('WAVE', 8);
pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out[i] * gain * 32767))), 44 + i * 2);
const path = 'public/assets/word-sort/sounds/complete.wav';
fs.writeFileSync(path, pcm);
console.log(`저장: ${path} (${(pcm.length / 1024).toFixed(0)}KB, ${DUR}s, ${SR}Hz mono 16bit)`);
