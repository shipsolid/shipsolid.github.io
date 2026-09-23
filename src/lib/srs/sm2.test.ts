import { describe, expect, it } from 'vitest';
import { addDays, createCardState, isDue, isRecalled, schedule } from './sm2';
import type { CardSrsState } from './sm2';

describe('createCardState', () => {
  it('creates a fresh card at the default ease, due today, with no history', () => {
    const state = createCardState('card-1', '2026-01-05');
    expect(state).toEqual({
      reviewId: 'card-1',
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: '2026-01-05',
      lapses: 0,
    });
  });
});

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-01-05', 3)).toBe('2026-01-08');
  });

  it('rolls over a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('rolls over a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('rounds fractional day counts', () => {
    expect(addDays('2026-01-05', 6.4)).toBe('2026-01-11');
  });

  it('supports negative offsets (looking backward)', () => {
    expect(addDays('2026-01-05', -1)).toBe('2026-01-04');
  });
});

describe('schedule', () => {
  function freshState(overrides: Partial<CardSrsState> = {}): CardSrsState {
    return { ...createCardState('card-1', '2026-01-01'), ...overrides };
  }

  it('on "again": resets repetitions to 0, sets a 1-day interval, and increments lapses', () => {
    const state = freshState({ repetitions: 3, interval: 10, lapses: 1 });
    const next = schedule(state, 'again', '2026-01-05');
    expect(next.repetitions).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.dueDate).toBe('2026-01-06');
    expect(next.lapses).toBe(2);
  });

  it('first success ("good") schedules a 1-day interval and repetitions=1', () => {
    const state = freshState();
    const next = schedule(state, 'good', '2026-01-05');
    expect(next.repetitions).toBe(1);
    expect(next.interval).toBe(1);
    expect(next.dueDate).toBe('2026-01-06');
  });

  it('second consecutive success schedules a 6-day interval and repetitions=2', () => {
    const state = freshState({ repetitions: 1, interval: 1 });
    const next = schedule(state, 'good', '2026-01-05');
    expect(next.repetitions).toBe(2);
    expect(next.interval).toBe(6);
  });

  it('third+ success schedules interval = round(prevInterval * newEase)', () => {
    const state = freshState({ repetitions: 2, interval: 6, ease: 2.5 });
    const next = schedule(state, 'good', '2026-01-05');
    // quality=4 ("good") -> nextEase = 2.5 + (0.1 - 1*(0.08+1*0.02)) = 2.5 + 0 = 2.5
    expect(next.ease).toBeCloseTo(2.5);
    expect(next.repetitions).toBe(3);
    expect(next.interval).toBe(Math.round(6 * 2.5));
  });

  it('never drops ease below MIN_EASE even under repeated "again" grades', () => {
    let state = freshState({ ease: 1.35 });
    for (let i = 0; i < 10; i++) {
      state = schedule(state, 'again', '2026-01-05');
    }
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('grades an "easy" review to a higher ease than an equivalent "good" review', () => {
    const state = freshState({ ease: 2.5 });
    const good = schedule(state, 'good', '2026-01-05');
    const easy = schedule(state, 'easy', '2026-01-05');
    expect(easy.ease).toBeGreaterThan(good.ease);
  });

  it('does not mutate the input state object', () => {
    const state = freshState({ repetitions: 1, interval: 1 });
    const snapshot = { ...state };
    schedule(state, 'good', '2026-01-05');
    expect(state).toEqual(snapshot);
  });
});

describe('isDue', () => {
  it('treats an undefined state (never graded) as always due', () => {
    expect(isDue(undefined, '2026-01-05')).toBe(true);
  });

  it('is due when dueDate is on or before today', () => {
    const state = createCardState('card-1', '2026-01-01');
    expect(isDue({ ...state, dueDate: '2026-01-05' }, '2026-01-05')).toBe(true);
    expect(isDue({ ...state, dueDate: '2026-01-04' }, '2026-01-05')).toBe(true);
  });

  it('is not due when dueDate is after today', () => {
    const state = createCardState('card-1', '2026-01-01');
    expect(isDue({ ...state, dueDate: '2026-01-06' }, '2026-01-05')).toBe(false);
  });
});

describe('isRecalled', () => {
  it('treats "again" as not recalled', () => {
    expect(isRecalled('again')).toBe(false);
  });

  it('treats hard/good/easy as recalled', () => {
    expect(isRecalled('hard')).toBe(true);
    expect(isRecalled('good')).toBe(true);
    expect(isRecalled('easy')).toBe(true);
  });
});
