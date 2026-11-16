/**
 * 오늘의 퍼즐 푸시 알림의 "누구에게 무슨 말을 보낼지" 판단 로직.
 * Firestore/FCM 에 의존하지 않는 순수 함수라서 테스트할 수 있다 (dailyPush.test.ts).
 *
 * 날짜 키는 앱의 todayKey() 와 같은 YYYY-MM-DD 이고, 사용자 기기의 로컬 날짜 기준이다.
 * 서버에서는 토큰에 저장된 IANA 시간대(tz)로 그 사용자의 "오늘"을 계산한다.
 */

export type PushLang = "ko" | "en" | "ja";
export const PUSH_LANGS: readonly PushLang[] = ["ko", "en", "ja"];
export const DEFAULT_TZ = "Asia/Seoul";
export const DEFAULT_LANG: PushLang = "ko";

/** 사용자 로컬 시각으로 이 시(時)에 보낸다. */
export const MORNING_LOCAL_HOUR = 8;
export const EVENING_LOCAL_HOUR = 21;

/**
 * 월간 전체 클리어 보상이 있는 달과 칭호. src/data/daily-challenges.json(+ locales/{en,ja}/modals.json 의
 * challengeTitles.daily_YYYY-MM) 과 맞춰야 한다. 번역이 없는 언어는 한국어 칭호를 쓴다.
 */
export const MONTH_REWARDS: Record<string, Partial<Record<PushLang, string>> & { ko: string }> = {
  "2026-10": { ko: "스도쿠 좀비", en: "Sudoku Zombie", ja: "数独ゾンビ" },
  "2026-11": { ko: "단어 박사", en: "Word Scholar", ja: "ことば博士" },
};

/**
 * 달마다 데일리 게임. src/features/daily/data/months.ts 의 DAILY_MONTHS 와 맞춰야 한다.
 * 해외판(en/ja) 사용자는 그 달 게임이 INTL_GAMES 에 있을 때만 알림을 받는다(워드스택 달은 해외판에서 닫혀 있다).
 */
export const MONTH_GAMES: Record<string, string> = {
  "2026-09": "sudoku",
  "2026-10": "sudoku",
  "2026-11": "word-sort",
};
/** src/i18n/locale.ts 의 INTL_AVAILABLE_GAMES 와 맞출 것 */
export const INTL_GAMES = new Set(["sudoku", "queens", "jigsaw", "snapspot"]);

export interface PushMessage {
  title: string;
  body: string;
}

// ─── 시간대 ──────────────────────────────────────────────────────────────────

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

export function normalizeLang(lang: unknown): PushLang {
  return PUSH_LANGS.includes(lang as PushLang) ? (lang as PushLang) : DEFAULT_LANG;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
    partsCache.set(tz, f);
  }
  return f;
}

function localParts(now: Date, tz: string): { date: string; hour: number } {
  const parts = formatterFor(normalizeTimeZone(tz)).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

/** 그 시간대의 로컬 날짜 YYYY-MM-DD */
export function localDateKey(now: Date, tz: string): string {
  return localParts(now, tz).date;
}

/** 그 시간대의 로컬 시(0~23) */
export function localHour(now: Date, tz: string): number {
  return localParts(now, tz).hour;
}

/** 한국 시간(UTC+9) 기준 YYYY-MM-DD */
export function kstDateKey(now: Date): string {
  return localDateKey(now, DEFAULT_TZ);
}

/**
 * 로컬 아침 8시 알림이 나가는 UTC 시(0~23) — 토큰의 pushHourUtc 필드.
 * 스케줄러는 매시 정각(UTC)에 돌기 때문에 "그 UTC 정각에 로컬 시가 8인" 시를 고른다
 * (인도처럼 30분 단위 시간대는 로컬 8:30 에 나간다). 저녁(21시)은 보통 +13시간이다.
 * 서머타임으로 바뀔 수 있으므로 기준 시각(now) 의 날짜로 계산하고, 발송 때 실제 로컬 시를 다시 확인한다.
 */
export function morningHourUtc(tz: string, now: Date = new Date()): number {
  const zone = normalizeTimeZone(tz);
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  for (let h = 0; h < 24; h++) {
    if (localHour(new Date(Date.UTC(y, m, d, h)), zone) === MORNING_LOCAL_HOUR) return h;
  }
  // 서머타임 전환으로 그날 8시가 없는 극단적인 경우: 한 시간 앞을 쓴다.
  for (let h = 0; h < 24; h++) {
    if (localHour(new Date(Date.UTC(y, m, d, h)), zone) === MORNING_LOCAL_HOUR + 1) return (h + 23) % 24;
  }
  return 23; // 한국 시간 8시
}

/** 저녁 슬롯에 조회할 pushHourUtc 값 (pushHourUtc 는 아침 기준으로만 저장한다) */
export function eveningQueryHour(utcHour: number): number {
  return (utcHour - (EVENING_LOCAL_HOUR - MORNING_LOCAL_HOUR) + 24 * 2) % 24;
}

/**
 * 이번 UTC 정각에 조회한 토큰을 지금 보낼지 판단한다(저장된 pushHourUtc 가 서머타임 등으로 어긋났을 때 대비).
 *  - 'send'  : 로컬 시가 목표 시 또는 한 시간 늦음 → 지금 보낸다.
 *  - 'later' : 한 시간 이르다 → 보내지 않고 pushHourUtc 를 고쳐 다음 정각 조회에 걸리게 한다.
 *  - 'skip'  : 그 밖(크게 어긋남) → 보내지 않고 pushHourUtc 만 고친다.
 */
export function slotDecision(now: Date, tz: string, targetLocalHour: number): "send" | "later" | "skip" {
  const h = localHour(now, tz);
  if (h === targetLocalHour || h === (targetLocalHour + 1) % 24) return "send";
  if (h === (targetLocalHour + 23) % 24) return "later";
  return "skip";
}

// ─── 날짜 계산 ───────────────────────────────────────────────────────────────

/** YYYY-MM-DD 에 일수를 더한다 (UTC 로만 계산해서 시간대에 흔들리지 않는다). */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** 그 달의 일수 (monthKey: YYYY-MM) */
export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export interface StreakInfo {
  /** 연속으로 푼 일수. 오늘 풀었으면 오늘까지, 아직이면 어제까지 센다. */
  streak: number;
  clearedToday: boolean;
}

export function computeStreak(clearedDates: Iterable<string>, today: string): StreakInfo {
  const set = new Set(clearedDates);
  const clearedToday = set.has(today);
  let cursor = clearedToday ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return { streak, clearedToday };
}

export interface MonthProgress {
  month: string;
  title: string;
  /** 이번 달 전체 클리어까지 남은 문제 수 */
  remaining: number;
  /** 오늘을 포함해 이번 달에 남은 날 수 */
  daysLeft: number;
}

/** 이번 달에 월간 보상이 있다면 진행 상황을 돌려준다. */
export function monthProgress(clearedDates: Iterable<string>, today: string, lang: PushLang = "ko"): MonthProgress | null {
  const month = today.slice(0, 7);
  const titles = MONTH_REWARDS[month];
  if (!titles) return null;
  const title = titles[lang] ?? titles.ko;
  const total = daysInMonth(month);
  let cleared = 0;
  for (const d of clearedDates) if (d.startsWith(month)) cleared += 1;
  const dayOfMonth = Number(today.slice(8, 10));
  return { month, title, remaining: Math.max(0, total - cleared), daysLeft: total - dayOfMonth + 1 };
}

/** 이 언어 사용자에게 오늘(로컬 날짜) 데일리가 열려 있는지. 한국어는 항상, 해외판은 그 달 게임이 해외 공개일 때만. */
export function isDailyOpenFor(lang: PushLang, today: string): boolean {
  if (lang === "ko") return true;
  const game = MONTH_GAMES[today.slice(0, 7)];
  return game !== undefined && INTL_GAMES.has(game);
}

// ─── 문구 ────────────────────────────────────────────────────────────────────

const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TEMPLATES: Record<PushLang, {
  morningTitle: string;
  morningReward: (month: number, title: string, remaining: number) => string;
  morningStreak: (streak: number) => string;
  morningDefault: string;
  eveningTitle: string;
  eveningBody: (streak: number) => string;
}> = {
  ko: {
    morningTitle: "🧩 오늘의 퍼즐이 열렸어요!",
    morningReward: (m, title, n) => `${m}월 전체 클리어 보상(${title})까지 ${n}문제 남았어요`,
    morningStreak: (s) => `연속 ${s}일째 도전 중이에요`,
    morningDefault: "오늘도 하나 풀어 볼까요?",
    eveningTitle: "⏰ 연속 기록이 끊기기 직전이에요",
    eveningBody: (s) => `오늘 안 풀면 연속 ${s}일 기록이 끊겨요`,
  },
  en: {
    morningTitle: "🧩 Today's puzzle is here!",
    morningReward: (m, title, n) =>
      `${n} more to go for the ${MONTH_NAMES_EN[m - 1]} full-clear reward (${title})`,
    morningStreak: (s) => `You're on a ${s}-day streak`,
    morningDefault: "Ready for today's puzzle?",
    eveningTitle: "⏰ Your streak is about to end",
    eveningBody: (s) => (s === 1 ? "Solve today's puzzle to keep your 1-day streak" : `Solve today's puzzle to keep your ${s}-day streak`),
  },
  ja: {
    morningTitle: "🧩 今日のパズルが届きました！",
    morningReward: (m, title, n) => `${m}月の全クリア報酬（${title}）まであと${n}問です`,
    morningStreak: (s) => `${s}日連続でチャレンジ中です`,
    morningDefault: "今日も1問解いてみませんか？",
    eveningTitle: "⏰ 連続記録が途切れそうです",
    eveningBody: (s) => `今日解かないと${s}日連続の記録が途切れます`,
  },
};

/**
 * 아침 8시 알림. 이미 오늘 푼 사람에게는 보내지 않는다.
 * 월간 보상을 아직 노릴 수 있고 막바지(남은 문제 ≤ 3, 남은 날 ≤ 7)이면 보상 문구를 쓴다.
 */
export function buildMorningMessage(clearedDates: string[], today: string, lang: PushLang = "ko"): PushMessage | null {
  if (!isDailyOpenFor(lang, today)) return null;
  const tpl = TEMPLATES[lang];
  const { streak, clearedToday } = computeStreak(clearedDates, today);
  if (clearedToday) return null;

  const month = monthProgress(clearedDates, today, lang);
  const reachable = month && month.remaining <= month.daysLeft;
  if (month && reachable && month.remaining > 0 && month.remaining <= 3 && month.daysLeft <= 7) {
    return {
      title: tpl.morningTitle,
      body: tpl.morningReward(Number(month.month.slice(5)), month.title, month.remaining),
    };
  }
  return {
    title: tpl.morningTitle,
    body: streak > 0 ? tpl.morningStreak(streak) : tpl.morningDefault,
  };
}

/** 밤 9시 알림. 연속 기록이 있고 오늘 아직 안 푼 사람에게만 보낸다. */
export function buildEveningMessage(clearedDates: string[], today: string, lang: PushLang = "ko"): PushMessage | null {
  if (!isDailyOpenFor(lang, today)) return null;
  const { streak, clearedToday } = computeStreak(clearedDates, today);
  if (clearedToday || streak < 1) return null;
  const tpl = TEMPLATES[lang];
  return { title: tpl.eveningTitle, body: tpl.eveningBody(streak) };
}

/** 알림을 눌렀을 때 열 주소 (해외판은 언어 접두사) */
export function dailyLinkFor(lang: PushLang): string {
  return lang === "ko" ? "/daily" : `/${lang}/daily`;
}
