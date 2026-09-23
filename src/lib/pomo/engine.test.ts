import { describe, expect, it } from 'vitest';
import { formatTime, nextPhase, phaseDurationMs, resetPhase } from './engine';

describe('phaseDurationMs', () => {
  const settings = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15 };

  it('reads focusMin/shortBreakMin/longBreakMin for the matching phase', () => {
    expect(phaseDurationMs('focus', settings)).toBe(25 * 60 * 1000);
    expect(phaseDurationMs('short', settings)).toBe(5 * 60 * 1000);
    expect(phaseDurationMs('long', settings)).toBe(15 * 60 * 1000);
  });
});

describe('resetPhase', () => {
  it('returns a stopped, fully-refilled state for the given phase', () => {
    const settings = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15 };
    expect(resetPhase('short', settings)).toEqual({
      phase: 'short',
      running: false,
      remainingMs: 5 * 60 * 1000,
      endTimestamp: null,
    });
  });
});

describe('nextPhase', () => {
  it('sends every Nth completed focus session to a long break, others to short', () => {
    const base = { finishedPhase: 'focus' as const, sessionsUntilLongBreak: 4 };
    expect(nextPhase({ ...base, sessionsCompleted: 1 })).toBe('short');
    expect(nextPhase({ ...base, sessionsCompleted: 2 })).toBe('short');
    expect(nextPhase({ ...base, sessionsCompleted: 3 })).toBe('short');
    expect(nextPhase({ ...base, sessionsCompleted: 4 })).toBe('long');
    expect(nextPhase({ ...base, sessionsCompleted: 5 })).toBe('short');
    expect(nextPhase({ ...base, sessionsCompleted: 8 })).toBe('long');
  });

  it('always returns focus after a short or long break', () => {
    expect(nextPhase({ finishedPhase: 'short', sessionsCompleted: 1, sessionsUntilLongBreak: 4 })).toBe('focus');
    expect(nextPhase({ finishedPhase: 'long', sessionsCompleted: 4, sessionsUntilLongBreak: 4 })).toBe('focus');
  });
});

describe('formatTime', () => {
  it('pads minutes and seconds to two digits', () => {
    expect(formatTime(65 * 1000)).toBe('01:05');
    expect(formatTime(9 * 1000)).toBe('00:09');
  });

  it('rounds up partial seconds so the display never shows 00:00 before time is actually up', () => {
    expect(formatTime(1500)).toBe('00:02');
  });

  it('handles zero', () => {
    expect(formatTime(0)).toBe('00:00');
  });
});
