import { describe, expect, it } from 'vitest';
import type { PomoStats } from './stats';
import { ACHIEVEMENTS, computeUpdatedStreak, MAX_DAILY_LOG_DAYS, recordFocusSession, todayKey, trimDailyLog } from './stats';

function makeStats(overrides: Partial<PomoStats> = {}): PomoStats {
  return {
    v: 1,
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestDaySessions: 0,
    bestDayMinutes: 0,
    lastSessionDate: null,
    dailyLog: {},
    ...overrides,
  };
}

describe('todayKey', () => {
  it('formats as zero-padded YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('trimDailyLog', () => {
  it('leaves a log at or under the cap untouched', () => {
    const log = { '2026-01-01': 2, '2026-01-02': 1 };
    expect(trimDailyLog(log)).toEqual(log);
  });

  it('drops the oldest keys once the cap is exceeded, keeping the newest MAX_DAILY_LOG_DAYS', () => {
    const log: Record<string, number> = {};
    const dates: string[] = [];
    for (let i = 0; i < MAX_DAILY_LOG_DAYS + 1; i++) {
      const key = todayKey(new Date(2026, 0, 1 + i)); // real calendar rollover past Jan 31
      dates.push(key);
      log[key] = i;
    }
    const trimmed = trimDailyLog(log);
    expect(Object.keys(trimmed)).toHaveLength(MAX_DAILY_LOG_DAYS);
    expect(trimmed[dates[0]]).toBeUndefined(); // oldest day dropped
    expect(trimmed[dates[dates.length - 1]]).toBe(MAX_DAILY_LOG_DAYS); // newest day kept
  });

  it('does not mutate the input object', () => {
    const log: Record<string, number> = {};
    for (let i = 1; i <= MAX_DAILY_LOG_DAYS + 1; i++) log[`day-${i}`] = i;
    trimDailyLog(log);
    expect(Object.keys(log)).toHaveLength(MAX_DAILY_LOG_DAYS + 1);
  });
});

describe('computeUpdatedStreak', () => {
  it('starts a streak at 1 when there is no prior session', () => {
    expect(computeUpdatedStreak(null, 0, '2026-01-05')).toBe(1);
  });

  it('keeps the streak unchanged for a second session on the same day', () => {
    expect(computeUpdatedStreak('2026-01-05', 3, '2026-01-05')).toBe(3);
  });

  it('increments the streak when the last session was exactly one day earlier', () => {
    expect(computeUpdatedStreak('2026-01-04', 3, '2026-01-05')).toBe(4);
  });

  it('resets the streak to 1 when a day was missed', () => {
    expect(computeUpdatedStreak('2026-01-01', 5, '2026-01-05')).toBe(1);
  });
});

describe('recordFocusSession', () => {
  it('increments totals and today’s daily log entry', () => {
    const stats = makeStats();
    const result = recordFocusSession({ stats, today: '2026-01-05', focusMin: 25 });
    expect(result.totalSessions).toBe(1);
    expect(result.totalFocusMinutes).toBe(25);
    expect(result.dailyLog['2026-01-05']).toBe(1);
    expect(result.lastSessionDate).toBe('2026-01-05');
  });

  it('continues the streak across consecutive days and tracks bestStreak', () => {
    const stats = makeStats({ lastSessionDate: '2026-01-04', currentStreak: 2, bestStreak: 2 });
    const result = recordFocusSession({ stats, today: '2026-01-05', focusMin: 25 });
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
  });

  it('resets the streak after a missed day without lowering bestStreak', () => {
    const stats = makeStats({ lastSessionDate: '2026-01-01', currentStreak: 5, bestStreak: 5 });
    const result = recordFocusSession({ stats, today: '2026-01-05', focusMin: 25 });
    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(5);
  });

  it('tracks a second same-day session toward bestDaySessions/bestDayMinutes, not the streak', () => {
    const stats = makeStats({
      lastSessionDate: '2026-01-05',
      currentStreak: 1,
      dailyLog: { '2026-01-05': 1 },
      totalSessions: 1,
      totalFocusMinutes: 25,
    });
    const result = recordFocusSession({ stats, today: '2026-01-05', focusMin: 25 });
    expect(result.currentStreak).toBe(1);
    expect(result.dailyLog['2026-01-05']).toBe(2);
    expect(result.bestDaySessions).toBe(2);
    expect(result.bestDayMinutes).toBe(50);
  });

  it('does not mutate the input stats object', () => {
    const stats = makeStats();
    recordFocusSession({ stats, today: '2026-01-05', focusMin: 25 });
    expect(stats.totalSessions).toBe(0);
    expect(stats.dailyLog).toEqual({});
  });
});

describe('ACHIEVEMENTS', () => {
  it('unlocks First Step at exactly 1 session and not at 0', () => {
    const firstStep = ACHIEVEMENTS.find((a) => a.label === 'First Step')!;
    expect(firstStep.check(makeStats({ totalSessions: 0 }))).toBe(false);
    expect(firstStep.check(makeStats({ totalSessions: 1 }))).toBe(true);
  });

  it('gates streak-based achievements on bestStreak, not currentStreak', () => {
    const weekWarrior = ACHIEVEMENTS.find((a) => a.label === 'Week Warrior')!;
    expect(weekWarrior.check(makeStats({ currentStreak: 7, bestStreak: 2 }))).toBe(false);
    expect(weekWarrior.check(makeStats({ currentStreak: 1, bestStreak: 7 }))).toBe(true);
  });
});
