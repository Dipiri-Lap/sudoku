/**
 * 오늘의 퍼즐 푸시 알림의 "누구에게 무슨 말을 보낼지" 판단 로직.
 * Firestore/FCM 에 의존하지 않는 순수 함수라서 테스트할 수 있다 (dailyPush.test.ts).
 *
 * 날짜 키는 앱의 todayKey() 와 같은 YYYY-MM-DD (한국 시간 기준).
 */

/** 월간 전체 클리어 보상이 있는 달과 칭호. src/data/daily-challenges.json 과 맞춰야 한다. */
export const MONTH_REWARDS: Record<string, string> = {
  "2026-10": "스도쿠 좀비",
  "2026-11": "단어 박사",
};

export interface PushMessage {
  title: string;
  body: string;
}

/** 한국 시간(UTC+9) 기준 YYYY-MM-DD */
export function kstDateKey(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

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
export function monthProgress(clearedDates: Iterable<string>, today: string): MonthProgress | null {
  const month = today.slice(0, 7);
  const title = MONTH_REWARDS[month];
  if (!title) return null;
  const total = daysInMonth(month);
  let cleared = 0;
  for (const d of clearedDates) if (d.startsWith(month)) cleared += 1;
  const dayOfMonth = Number(today.slice(8, 10));
  return { month, title, remaining: Math.max(0, total - cleared), daysLeft: total - dayOfMonth + 1 };
}

/**
 * 아침 8시 알림. 이미 오늘 푼 사람에게는 보내지 않는다.
 * 월간 보상을 아직 노릴 수 있고 막바지(남은 문제 ≤ 3, 남은 날 ≤ 7)이면 보상 문구를 쓴다.
 */
export function buildMorningMessage(clearedDates: string[], today: string): PushMessage | null {
  const { streak, clearedToday } = computeStreak(clearedDates, today);
  if (clearedToday) return null;

  const month = monthProgress(clearedDates, today);
  const reachable = month && month.remaining <= month.daysLeft;
  if (month && reachable && month.remaining > 0 && month.remaining <= 3 && month.daysLeft <= 7) {
    return {
      title: "🧩 오늘의 퍼즐이 열렸어요!",
      body: `${Number(month.month.slice(5))}월 전체 클리어 보상(${month.title})까지 ${month.remaining}문제 남았어요`,
    };
  }
  return {
    title: "🧩 오늘의 퍼즐이 열렸어요!",
    body: streak > 0 ? `연속 ${streak}일째 도전 중이에요` : "오늘도 하나 풀어 볼까요?",
  };
}

/** 밤 9시 알림. 연속 기록이 있고 오늘 아직 안 푼 사람에게만 보낸다. */
export function buildEveningMessage(clearedDates: string[], today: string): PushMessage | null {
  const { streak, clearedToday } = computeStreak(clearedDates, today);
  if (clearedToday || streak < 1) return null;
  return {
    title: "⏰ 연속 기록이 끊기기 직전이에요",
    body: `오늘 안 풀면 연속 ${streak}일 기록이 끊겨요`,
  };
}
