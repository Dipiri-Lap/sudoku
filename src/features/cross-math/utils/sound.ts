/**
 * 크로썸 사운드.
 *
 * 볼륨은 BGM·효과음 두 개의 마스터 값(0~1)으로 조절하고 localStorage 에 저장한다.
 * 소리마다 정해 둔 기본 비중에 마스터를 곱해 재생하므로, 슬라이더를 움직여도
 * 소리들 사이의 균형(배치가 가장 또렷하고 선택이 가장 작음)은 그대로 유지된다.
 */

const BASE = '/assets/crossum/sounds';

/** 소리별 기본 비중 — 이 값에 효과음 마스터를 곱한다 */
const SFX = {
  select: { file: 'select.mp3', weight: 0.5 },
  insert: { file: 'insert.mp3', weight: 0.8 },
  remove: { file: 'remove.mp3', weight: 0.6 },
  complete: { file: 'complate.mp3', weight: 0.85 },
  clear: { file: 'clear.mp3', weight: 0.9 },
  fail: { file: 'fail.mp3', weight: 0.65 },
} as const;

export type SfxName = keyof typeof SFX;

const BGM_FILES = ['bgm1.mp3', 'bgm2.mp3'];
/** BGM 은 효과음보다 확실히 낮게 깔린다 */
const BGM_WEIGHT = 0.6;

const LS_BGM = 'crossum_bgm_volume';
const LS_SFX = 'crossum_sfx_volume';
const LS_LEGACY_MUTED = 'crossum_muted';

export const DEFAULT_BGM_VOLUME = 0.3;
export const DEFAULT_SFX_VOLUME = 0.7;

function loadVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const v = parseFloat(raw);
      if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
    }
    // 예전 음소거 설정을 쓰던 사용자는 소리가 갑자기 나지 않도록 0으로 시작한다
    if (localStorage.getItem(LS_LEGACY_MUTED) === '1') return 0;
  } catch {
    // localStorage 접근 실패 — 기본값으로 진행
  }
  return fallback;
}

let bgmVolume = loadVolume(LS_BGM, DEFAULT_BGM_VOLUME);
let sfxVolume = loadVolume(LS_SFX, DEFAULT_SFX_VOLUME);

function save(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 저장 실패는 무시 — 이번 세션 동안만 유지된다
  }
}

// ── 효과음 ──────────────────────────────────────────────────────────────────

const cache = new Map<SfxName, HTMLAudioElement>();

function get(name: SfxName): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let el = cache.get(name);
  if (!el) {
    el = new Audio(`${BASE}/${SFX[name].file}`);
    el.preload = 'auto';
    cache.set(name, el);
  }
  el.volume = Math.min(1, SFX[name].weight * sfxVolume);
  return el;
}

export function playSfx(name: SfxName): void {
  if (sfxVolume <= 0) return;
  const el = get(name);
  if (!el) return;
  try {
    el.currentTime = 0;
  } catch {
    // 아직 로드 전이면 되감기가 실패할 수 있다. 재생만 시도한다.
  }
  // 사용자 조작 전에는 브라우저가 재생을 막는다. 조용히 넘긴다.
  void el.play().catch(() => {});
}

/** 첫 사용자 조작 때 불러 두면 이후 재생이 끊기지 않는다 */
export function warmUpSfx(): void {
  for (const name of Object.keys(SFX) as SfxName[]) get(name);
}

// ── 배경음 ──────────────────────────────────────────────────────────────────

let bgm: HTMLAudioElement | null = null;

/**
 * 스테이지 모드를 시작할 때 두 곡 중 하나를 골라 반복 재생한다.
 * 이미 재생 중이면 아무것도 하지 않는다 — 스테이지를 넘길 때마다 곡이 끊기면 거슬린다.
 * 파일이 3MB쯤 되므로 고른 한 곡만 만든다(둘 다 만들면 6MB를 받는다).
 */
export function startBgm(): void {
  if (typeof Audio === 'undefined') return;
  if (!bgm) {
    const file = BGM_FILES[Math.floor(Math.random() * BGM_FILES.length)];
    bgm = new Audio(`${BASE}/${file}`);
    bgm.loop = true;
  }
  bgm.volume = Math.min(1, BGM_WEIGHT * bgmVolume);
  if (bgmVolume > 0 && bgm.paused) void bgm.play().catch(() => {});
}

/**
 * 잠시 멈춘다. stopBgm 과 달리 고른 곡을 그대로 들고 있어서
 * resumeBgm 하면 멈춘 지점부터 이어진다 (클리어 연출 동안 쓴다).
 */
export function pauseBgm(): void {
  bgm?.pause();
}

export function resumeBgm(): void {
  if (!bgm || bgmVolume <= 0) return;
  void bgm.play().catch(() => {});
}

export function stopBgm(): void {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
  bgm = null; // 다음에 시작할 때 다시 무작위로 고르게 한다
}

// ── 설정 ────────────────────────────────────────────────────────────────────

export function getBgmVolume(): number {
  return bgmVolume;
}
export function getSfxVolume(): number {
  return sfxVolume;
}

export function setBgmVolume(v: number): void {
  bgmVolume = Math.min(1, Math.max(0, v));
  save(LS_BGM, bgmVolume);
  if (!bgm) return;
  bgm.volume = Math.min(1, BGM_WEIGHT * bgmVolume);
  if (bgmVolume <= 0) bgm.pause();
  else if (bgm.paused) void bgm.play().catch(() => {});
}

export function setSfxVolume(v: number): void {
  sfxVolume = Math.min(1, Math.max(0, v));
  save(LS_SFX, sfxVolume);
}
