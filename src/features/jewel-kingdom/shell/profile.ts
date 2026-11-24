/**
 * Pop Garden 플레이어 기록(기기에 저장).
 *
 * 매치3 게임의 기본 틀을 따른다:
 *  - 스테이지는 1부터 하나씩 연다(로비의 "레벨 N" 버튼이 다음 판)
 *  - 하트(목숨) 5개. 판을 지거나 도중에 나가면 하나 잃고, 30분마다 하나씩 다시 찬다
 *  - 코인: 클리어 보상·출석 보상으로 얻고, 실패했을 때 "5수 더"에 쓴다
 *  - 출석: 7일 주기, 하루 한 번
 *
 * 서버 없이 localStorage만 쓴다. 값이 깨졌거나 없으면 새 기록으로 시작한다.
 */

export const MAX_LIVES = 5;
export const LIFE_REFILL_MS = 30 * 60 * 1000;
/** 클리어 보상 코인 */
export const WIN_COINS = 50;
/** 실패 후 "5수 더" 가격 */
export const CONTINUE_COST = 300;
export const CONTINUE_MOVES = 5;
/** 출석 보상(1~7일째) */
export const DAILY_REWARDS = [50, 80, 100, 150, 200, 300, 500];
/** 시즌 진행도: 클리어마다 얻는 별과 시즌 보상 상자까지의 목표 */
export const SEASON_PER_WIN = 100;
export const SEASON_GOAL = 5000;

export interface Profile {
  /** 다음에 할 스테이지 번호(1부터) */
  stage: number;
  coins: number;
  lives: number;
  /** 하트가 가득 차지 않았을 때, 다음 하나가 차는 시각(ms) */
  nextLifeAt: number | null;
  /** 출석: 지금까지 받은 날 수(7일 주기)와 마지막으로 받은 날짜(YYYY-MM-DD) */
  dailyStreak: number;
  dailyLast: string | null;
  /** 이벤트 재화(씨앗). 아직 쓰는 곳 없음 - 자리만 */
  seeds: number;
  /** 시즌 별(이번 달). 클리어마다 오른다 */
  season: number;
  /** 농장 별. 클리어마다 1개, 농장 다음 단계를 열 때 쓴다 */
  stars: number;
  /** 지금 농장 단계(FARM_STAGES 자리, 0부터) */
  farm: number;
  /** 밭마다 심은 시각(ms). 빈 밭은 키가 없다(PLOTS의 id) */
  plots: Record<string, number>;
}

const KEY = 'pop-garden-profile';

const FRESH: Profile = {
  stage: 1,
  coins: 500,
  lives: MAX_LIVES,
  nextLifeAt: null,
  dailyStreak: 0,
  dailyLast: null,
  seeds: 0,
  season: 0,
  // 처음 들어왔을 때 첫 단계(밭 일구기, 별 3개)를 바로 열어 볼 수 있게
  stars: 3,
  farm: 0,
  plots: {},
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FRESH };
    const p = { ...FRESH, ...(JSON.parse(raw) as Partial<Profile>) };
    if (!Number.isFinite(p.stage) || p.stage < 1) p.stage = 1;
    return refillLives(p, Date.now());
  } catch {
    return { ...FRESH };
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 저장 못 해도 이번 세션은 이어 간다 */
  }
}

/** 지난 시간만큼 하트를 채운다 */
export function refillLives(p: Profile, now: number): Profile {
  if (p.lives >= MAX_LIVES) return p.nextLifeAt === null ? p : { ...p, nextLifeAt: null };
  if (p.nextLifeAt === null) return { ...p, nextLifeAt: now + LIFE_REFILL_MS };
  if (now < p.nextLifeAt) return p;
  const gained = 1 + Math.floor((now - p.nextLifeAt) / LIFE_REFILL_MS);
  const lives = Math.min(MAX_LIVES, p.lives + gained);
  return {
    ...p,
    lives,
    nextLifeAt: lives >= MAX_LIVES ? null : p.nextLifeAt + gained * LIFE_REFILL_MS,
  };
}

export function loseLife(p: Profile, now: number): Profile {
  const lives = Math.max(0, p.lives - 1);
  return { ...p, lives, nextLifeAt: p.nextLifeAt ?? now + LIFE_REFILL_MS };
}

export function today(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canClaimDaily(p: Profile): boolean {
  return p.dailyLast !== today();
}

/** 오늘 받을 차례(0~6). 하루 이상 걸렀어도 이어 간다(벌칙 없음) */
export function dailyIndex(p: Profile): number {
  return p.dailyStreak % DAILY_REWARDS.length;
}

export function claimDaily(p: Profile): Profile {
  if (!canClaimDaily(p)) return p;
  return {
    ...p,
    coins: p.coins + DAILY_REWARDS[dailyIndex(p)],
    dailyStreak: p.dailyStreak + 1,
    dailyLast: today(),
  };
}

/** mm:ss */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 이벤트 마감까지 남은 시간 → "3일 16시간" / "5시간 12분" */
export function timeLeftLabel(end: number, now = Date.now()): string {
  const m = Math.max(0, Math.floor((end - now) / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}일 ${h}시간` : `${h}시간 ${m % 60}분`;
}

/** 이번 주 일요일 자정(다음 월요일 0시) */
export function endOfWeek(now = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.getTime();
}

/** 이번 달 마지막 날 자정(다음 달 1일 0시) */
export function endOfMonth(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
}
