/**
 * 애로우웨이 효과음.
 *
 * 화살이 빠져나갈 때 laser_01~03 중 하나를 무작위로, 막힌 화살을 잘못 눌렀을 때는 x.wav 를,
 * 스테이지를 클리어했을 때는 크로썸의 clear.mp3 를 그대로 가져다 재생한다.
 * 연속으로 빠르게 눌러도 앞 소리가 끊기지 않도록 재생할 때마다 복제본을 만들어 겹쳐 울린다.
 *
 * 볼륨은 효과음 마스터 값(0~1) 하나로 조절하고 localStorage 에 저장한다.
 * 0 이면 재생하지 않는다(음소거).
 */

const BASE = '/assets/arrowway/sound';
const FILES = ['laser_01.wav', 'laser_02.wav', 'laser_03.wav'];
const BLOCKED_FILE = 'x.wav';
/** 크로썸과 같은 클리어 소리 — 파일을 복사하지 않고 그쪽 경로를 그대로 쓴다 */
const CLEAR_URL = '/assets/crossum/sounds/clear.mp3';
const CLEAR_WEIGHT = 0.45; // 크로썸의 비중(0.9)의 절반 — 애로우웨이에서는 다른 효과음보다 튀어서 낮췄다
/** 이 소리의 기본 비중 — 마스터 볼륨에 곱한다 */
const WEIGHT = 0.85;

const LS_SFX = 'arrowway_sfx_volume';
export const DEFAULT_SFX_VOLUME = 0.7;

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(LS_SFX);
    if (raw !== null) {
      const v = parseFloat(raw);
      if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
    }
  } catch {
    // localStorage 접근 실패 — 기본값으로 진행
  }
  return DEFAULT_SFX_VOLUME;
}

let sfxVolume = loadVolume();

export function getSfxVolume(): number {
  return sfxVolume;
}

export function setSfxVolume(v: number): void {
  sfxVolume = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(LS_SFX, String(sfxVolume));
  } catch {
    // 저장 실패는 무시 — 이번 세션 동안만 유지된다
  }
}

const cache: HTMLAudioElement[] = [];
let blockedEl: HTMLAudioElement | null = null;
let clearEl: HTMLAudioElement | null = null;
let lastIndex = -1;

function load(): HTMLAudioElement[] {
  if (typeof Audio === 'undefined') return [];
  if (cache.length === 0) {
    for (const f of FILES) {
      const el = new Audio(`${BASE}/${f}`);
      el.preload = 'auto';
      cache.push(el);
    }
  }
  return cache;
}

/** 첫 재생 지연을 없애려고 게임 화면에 들어올 때 미리 불러 둔다. */
export function preloadEscapeSfx(): void {
  load();
  if (!blockedEl && typeof Audio !== 'undefined') {
    blockedEl = new Audio(`${BASE}/${BLOCKED_FILE}`);
    blockedEl.preload = 'auto';
  }
  if (!clearEl && typeof Audio !== 'undefined') {
    clearEl = new Audio(CLEAR_URL);
    clearEl.preload = 'auto';
  }
}

/** 재생할 때마다 복제본을 만들어 연타해도 앞 소리가 끊기지 않게 겹쳐 울린다. */
function playClone(source: HTMLAudioElement, weight = WEIGHT): void {
  try {
    const el = source.cloneNode(true) as HTMLAudioElement;
    el.volume = Math.min(1, weight * sfxVolume);
    void el.play().catch(() => { /* 자동재생 정책 등으로 막히면 조용히 넘어간다 */ });
  } catch {
    // 재생 실패는 게임 진행에 영향을 주지 않는다
  }
}

/** 막힌 화살을 잘못 눌렀을 때 */
export function playBlockedSfx(): void {
  if (sfxVolume <= 0) return;
  preloadEscapeSfx();
  if (blockedEl) playClone(blockedEl);
}

/** 스테이지 클리어 */
export function playClearSfx(): void {
  if (sfxVolume <= 0) return;
  preloadEscapeSfx();
  if (clearEl) playClone(clearEl, CLEAR_WEIGHT);
}

/** 세 소리 중 하나를 무작위로 — 같은 소리가 연달아 나오지 않게 직전 것은 뺀다. */
export function playEscapeSfx(): void {
  if (sfxVolume <= 0) return;
  const sounds = load();
  if (sounds.length === 0) return;
  let i = Math.floor(Math.random() * sounds.length);
  if (sounds.length > 1 && i === lastIndex) i = (i + 1) % sounds.length;
  lastIndex = i;
  playClone(sounds[i]);
}
