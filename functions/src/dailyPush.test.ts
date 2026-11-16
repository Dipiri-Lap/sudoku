import { describe, it, expect } from 'vitest';
import {
  addDays, buildEveningMessage, buildMorningMessage, computeStreak, dailyLinkFor, daysInMonth, eveningQueryHour,
  isDailyOpenFor, kstDateKey, localDateKey, localHour, monthProgress, morningHourUtc, normalizeLang,
  normalizeTimeZone, slotDecision,
} from './dailyPush';
import { tokenDefaultsPatch } from './dailyPushSender';

describe('날짜 계산', () => {
  it('한국 시간 기준 날짜 키', () => {
    // UTC 2026-10-27 15:30 = KST 2026-10-28 00:30
    expect(kstDateKey(new Date('2026-10-27T15:30:00Z'))).toBe('2026-10-28');
    expect(kstDateKey(new Date('2026-10-27T14:59:00Z'))).toBe('2026-10-27');
  });
  it('일수 더하기와 월 경계', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysInMonth('2026-10')).toBe(31);
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('연속 기록', () => {
  it('오늘 풀었으면 오늘까지, 아직이면 어제까지 센다', () => {
    const cleared = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'];
    expect(computeStreak(cleared, '2026-10-27')).toEqual({ streak: 4, clearedToday: true });
    expect(computeStreak(cleared, '2026-10-28')).toEqual({ streak: 4, clearedToday: false });
  });
  it('하루 비면 끊긴다', () => {
    const cleared = ['2026-10-20', '2026-10-21', '2026-10-27'];
    expect(computeStreak(cleared, '2026-10-28').streak).toBe(1);
    expect(computeStreak(cleared, '2026-10-29').streak).toBe(0);
  });
  it('달이 바뀌어도 이어진다', () => {
    expect(computeStreak(['2026-09-30', '2026-10-01'], '2026-10-02').streak).toBe(2);
  });
});

describe('아침 알림', () => {
  it('연속 기록이 있으면 문구에 넣는다', () => {
    const cleared = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
    expect(buildMorningMessage(cleared, '2026-10-06')?.body).toBe('연속 5일째 도전 중이에요');
  });
  it('기록이 없으면 기본 문구', () => {
    expect(buildMorningMessage([], '2026-10-06')?.body).toBe('오늘도 하나 풀어 볼까요?');
  });
  it('이미 오늘 푼 사람에게는 보내지 않는다', () => {
    expect(buildMorningMessage(['2026-10-06'], '2026-10-06')).toBeNull();
  });
  it('월말 막바지에는 보상 문구를 쓴다', () => {
    // 10월 1~28일 클리어, 오늘 29일 → 남은 문제 3, 남은 날 3
    const cleared = Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const msg = buildMorningMessage(cleared, '2026-10-29');
    expect(msg?.body).toBe('10월 전체 클리어 보상(스도쿠 좀비)까지 3문제 남았어요');
  });
  it('이미 달성이 불가능하면 보상 문구를 쓰지 않는다', () => {
    // 10월에 5일만 풀고 29일: 남은 문제 26 > 남은 날 3
    const cleared = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
    expect(buildMorningMessage(cleared, '2026-10-29')?.body).not.toContain('보상');
  });
  it('11월에는 단어 박사 보상 문구를 쓴다', () => {
    // 11월 1~27일 클리어, 오늘 28일 → 남은 문제 3, 남은 날 3
    const cleared = Array.from({ length: 27 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    expect(buildMorningMessage(cleared, '2026-11-28')?.body).toBe('11월 전체 클리어 보상(단어 박사)까지 3문제 남았어요');
  });
  it('보상이 없는 달에는 보상 문구를 쓰지 않는다', () => {
    expect(monthProgress(['2026-12-01'], '2026-12-28')).toBeNull();
  });
});

describe('저녁 알림', () => {
  it('연속 기록이 있고 오늘 안 풀었을 때만 보낸다', () => {
    const cleared = ['2026-10-25', '2026-10-26', '2026-10-27'];
    expect(buildEveningMessage(cleared, '2026-10-28')?.body).toBe('오늘 안 풀면 연속 3일 기록이 끊겨요');
  });
  it('오늘 풀었거나 지킬 기록이 없으면 보내지 않는다', () => {
    expect(buildEveningMessage(['2026-10-28'], '2026-10-28')).toBeNull();
    expect(buildEveningMessage([], '2026-10-28')).toBeNull();
    expect(buildEveningMessage(['2026-10-20'], '2026-10-28')).toBeNull();
  });
});

describe('사용자 시간대', () => {
  it('로컬 날짜·시', () => {
    const now = new Date('2026-11-16T05:00:00Z'); // KST 14시 / LA 전날 21시 / 런던 5시
    expect(localDateKey(now, 'Asia/Seoul')).toBe('2026-11-16');
    expect(localDateKey(now, 'America/Los_Angeles')).toBe('2026-11-15');
    expect(localHour(now, 'America/Los_Angeles')).toBe(21);
    expect(localHour(now, 'Europe/London')).toBe(5);
    expect(localHour(new Date('2026-11-16T00:00:00Z'), 'Europe/London')).toBe(0);
  });
  it('잘못된 시간대·언어는 기본값', () => {
    expect(normalizeTimeZone('Not/AZone')).toBe('Asia/Seoul');
    expect(normalizeTimeZone(undefined)).toBe('Asia/Seoul');
    expect(normalizeLang('fr')).toBe('ko');
    expect(normalizeLang('ja')).toBe('ja');
  });
  it('아침 8시가 되는 UTC 시 (pushHourUtc)', () => {
    const winter = new Date('2026-11-16T12:00:00Z');
    const summer = new Date('2026-07-01T12:00:00Z');
    expect(morningHourUtc('Asia/Seoul', winter)).toBe(23);
    expect(morningHourUtc('America/Los_Angeles', winter)).toBe(16); // PST UTC-8
    expect(morningHourUtc('America/Los_Angeles', summer)).toBe(15); // PDT UTC-7
    expect(morningHourUtc('Asia/Tokyo', winter)).toBe(23);
    expect(morningHourUtc('Asia/Kolkata', winter)).toBe(3); // UTC+5:30 → 3:00 UTC 에 로컬 8:30
    expect(morningHourUtc('Pacific/Kiritimati', winter)).toBe(18); // UTC+14
  });
  it('저녁 슬롯은 아침 pushHourUtc 보다 13시간 뒤에 조회한다', () => {
    expect(eveningQueryHour(12)).toBe(23); // KST 21시 = UTC 12시 → 아침 pushHourUtc 23
    expect(eveningQueryHour(5)).toBe(16); // LA 21시(PST) = UTC 5시 → 아침 16
    expect(eveningQueryHour(13)).toBe(0);
  });
  it('어긋난 pushHourUtc 처리: 제시간·한 시간 늦음은 보내고, 한 시간 이르면 다음 정각으로', () => {
    // LA, PDT→PST 로 바뀌었는데 pushHourUtc 가 15(PDT) 로 남은 경우: 15시 UTC = 로컬 7시
    expect(slotDecision(new Date('2026-11-16T15:00:00Z'), 'America/Los_Angeles', 8)).toBe('later');
    expect(slotDecision(new Date('2026-11-16T16:00:00Z'), 'America/Los_Angeles', 8)).toBe('send');
    // 반대(PST→PDT): 16시 UTC = 로컬 9시 → 한 시간 늦게라도 보낸다
    expect(slotDecision(new Date('2026-07-01T16:00:00Z'), 'America/Los_Angeles', 8)).toBe('send');
    expect(slotDecision(new Date('2026-07-01T20:00:00Z'), 'America/Los_Angeles', 8)).toBe('skip');
    expect(slotDecision(new Date('2026-11-16T12:00:00Z'), 'Asia/Seoul', 21)).toBe('send');
  });
  it('예전 토큰은 한국 시간·한국어로 채운다', () => {
    const now = new Date('2026-11-16T12:00:00Z');
    expect(tokenDefaultsPatch({ token: 'x' }, now)).toEqual({ tz: 'Asia/Seoul', lang: 'ko', pushHourUtc: 23 });
    expect(tokenDefaultsPatch({ token: 'x', tz: 'America/Los_Angeles', lang: 'en', pushHourUtc: 16 }, now)).toBeNull();
    expect(tokenDefaultsPatch({ token: 'x', tz: 'America/Los_Angeles', lang: 'en' }, now)).toEqual({ pushHourUtc: 16 });
  });
});

describe('언어별 문구', () => {
  it('영어·일본어 아침 문구', () => {
    // 2026-12 는 등록된 달이 아니라 해외판에서는 닫혀 있으므로, 해외 공개 달(10월, 스도쿠)로 확인한다.
    const cleared = ['2026-10-04', '2026-10-05'];
    expect(buildMorningMessage(cleared, '2026-10-06', 'en')).toEqual({ title: "🧩 Today's puzzle is here!", body: "You're on a 2-day streak" });
    expect(buildMorningMessage([], '2026-10-06', 'ja')?.body).toBe('今日も1問解いてみませんか？');
  });
  it('월간 보상 칭호도 언어에 맞춘다', () => {
    const cleared = Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    expect(buildMorningMessage(cleared, '2026-10-29', 'en')?.body).toBe('3 more to go for the October full-clear reward (Sudoku Zombie)');
    expect(buildMorningMessage(cleared, '2026-10-29', 'ja')?.body).toBe('10月の全クリア報酬（数独ゾンビ）まであと3問です');
    expect(monthProgress(cleared, '2026-10-29', 'ja')?.title).toBe('数独ゾンビ');
  });
  it('영어·일본어 저녁 문구', () => {
    const cleared = ['2026-10-25', '2026-10-26', '2026-10-27'];
    expect(buildEveningMessage(cleared, '2026-10-28', 'en')?.body).toBe("Solve today's puzzle to keep your 3-day streak");
    expect(buildEveningMessage(['2026-10-27'], '2026-10-28', 'en')?.body).toBe("Solve today's puzzle to keep your 1-day streak");
    expect(buildEveningMessage(cleared, '2026-10-28', 'ja')?.body).toBe('今日解かないと3日連続の記録が途切れます');
  });
  it('해외판은 그 달 게임이 해외 공개일 때만 보낸다 (워드스택 달·미등록 달은 닫힘)', () => {
    expect(isDailyOpenFor('ko', '2026-11-16')).toBe(true);
    expect(isDailyOpenFor('en', '2026-10-16')).toBe(true);
    expect(isDailyOpenFor('en', '2026-11-16')).toBe(false);
    expect(isDailyOpenFor('ja', '2027-01-01')).toBe(false);
    expect(buildMorningMessage([], '2026-11-16', 'en')).toBeNull();
    expect(buildMorningMessage([], '2026-11-16', 'ko')).not.toBeNull();
    expect(buildEveningMessage(['2026-11-15'], '2026-11-16', 'ja')).toBeNull();
  });
  it('알림 링크', () => {
    expect(dailyLinkFor('ko')).toBe('/daily');
    expect(dailyLinkFor('en')).toBe('/en/daily');
    expect(dailyLinkFor('ja')).toBe('/ja/daily');
  });
});
