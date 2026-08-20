/**
 * 크로썸 효과음.
 *
 * 파일마다 Audio 하나를 만들어 두고 재생 시 처음으로 되감는다.
 * 같은 소리가 연달아 나면 앞의 것이 끊기는데, 짧은 효과음에서는 겹쳐 울리는 것보다 이 편이 깔끔하다.
 */

const BASE = '/assets/crossum/sounds';

/** 소리별 기본 음량 — 배치가 가장 또렷하고, 회수·선택은 눌러 둔다 */
const SFX = {
  select: { file: 'select.mp3', volume: 0.35 },
  insert: { file: 'insert.mp3', volume: 0.55 },
  remove: { file: 'remove.mp3', volume: 0.4 },
  complete: { file: 'complate.mp3', volume: 0.6 },
  fail: { file: 'fail.mp3', volume: 0.45 },
} as const;

export type SfxName = keyof typeof SFX;

const LS_MUTED = 'crossum_muted';

let muted = (() => {
  try {
    return localStorage.getItem(LS_MUTED) === '1';
  } catch {
    return false;
  }
})();

const cache = new Map<SfxName, HTMLAudioElement>();

function get(name: SfxName): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let el = cache.get(name);
  if (!el) {
    const { file, volume } = SFX[name];
    el = new Audio(`${BASE}/${file}`);
    el.preload = 'auto';
    el.volume = volume;
    cache.set(name, el);
  }
  return el;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(LS_MUTED, next ? '1' : '0');
  } catch {
    // 저장 실패는 무시 — 이번 세션 동안만 유지된다
  }
  if (next) {
    for (const el of cache.values()) el.pause();
    bgm?.pause();
  } else {
    void bgm?.play().catch(() => {});
  }
}

export function playSfx(name: SfxName): void {
  if (muted) return;
  const el = get(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    // 사용자 조작 전에는 브라우저가 재생을 막는다. 조용히 넘긴다.
    void el.play().catch(() => {});
  } catch {
    // currentTime 설정이 실패할 수 있다(로드 전). 이때도 재생만 시도한다.
    void el.play?.().catch(() => {});
  }
}

// ── 배경음 ──────────────────────────────────────────────────────────────────

const BGM_FILES = ['bgm1.mp3', 'bgm2.mp3'];
const BGM_VOLUME = 0.18;

let bgm: HTMLAudioElement | null = null;

/**
 * 스테이지 모드를 시작할 때 두 곡 중 하나를 골라 반복 재생한다.
 * 이미 재생 중이면 아무것도 하지 않는다 — 스테이지를 넘길 때마다 곡이 끊기면 거슬린다.
 * 파일이 3MB쯤 되므로 고른 한 곡만 만든다(둘 다 만들면 6MB를 받는다).
 */
export function startBgm(): void {
  if (typeof Audio === 'undefined') return;
  if (bgm) {
    if (!muted && bgm.paused) void bgm.play().catch(() => {});
    return;
  }
  const file = BGM_FILES[Math.floor(Math.random() * BGM_FILES.length)];
  bgm = new Audio(`${BASE}/${file}`);
  bgm.loop = true;
  bgm.volume = BGM_VOLUME;
  if (!muted) void bgm.play().catch(() => {});
}

export function stopBgm(): void {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
  bgm = null;   // 다음에 시작할 때 다시 무작위로 고르게 한다
}

/** 첫 사용자 조작 때 불러 두면 이후 재생이 끊기지 않는다 */
export function warmUpSfx(): void {
  for (const name of Object.keys(SFX) as SfxName[]) get(name);
}
