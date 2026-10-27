import { describe, it, expect } from 'vitest';
import {
  addDays, buildEveningMessage, buildMorningMessage, computeStreak, daysInMonth, kstDateKey, monthProgress,
} from './dailyPush';

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
  it('보상이 없는 달에는 보상 문구를 쓰지 않는다', () => {
    expect(monthProgress(['2026-11-01'], '2026-11-28')).toBeNull();
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
