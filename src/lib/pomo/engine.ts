// Pure timer/phase math for the Pomodoro engine. Callers own the mutable `state`/`settings`
// objects (they live in pomo.astro's client script, next to the DOM/Audio code that actually
// needs to stay inline) — everything here takes what it needs as arguments and returns new data
// rather than mutating, which is what makes it unit-testable without a DOM.

export type Phase = 'focus' | 'short' | 'long';

export const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short Break', long: 'Long Break' };
// Catppuccin Mocha Teal / Sky / Lavender — matches the dark palette in styles/global.css.
export const PHASE_COLOR: Record<Phase, string> = { focus: '#94e2d5', short: '#89dceb', long: '#b4befe' };
// Used for both the ring stroke and the phase-label text color (via the
// --phase-color CSS var) — the dark set's bright/light hues fail WCAG AA as
// text on a white background, same reasoning as the site's accent color.
export const PHASE_COLOR_LIGHT: Record<Phase, string> = { focus: '#0f766e', short: '#0284c7', long: '#4f46e5' };

export interface PhaseDurationSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}

export function phaseDurationMs(phase: Phase, settings: PhaseDurationSettings): number {
  const minutes =
    phase === 'focus' ? settings.focusMin : phase === 'short' ? settings.shortBreakMin : settings.longBreakMin;
  return minutes * 60 * 1000;
}

export interface TimerState {
  phase: Phase;
  sessionsCompleted: number;
  running: boolean;
  endTimestamp: number | null;
  remainingMs: number | null;
}

export function resetPhase(
  phase: Phase,
  settings: PhaseDurationSettings
): Pick<TimerState, 'phase' | 'running' | 'remainingMs' | 'endTimestamp'> {
  return { phase, running: false, remainingMs: phaseDurationMs(phase, settings), endTimestamp: null };
}

export interface NextPhaseInput {
  /** The phase that just finished — i.e. state.phase BEFORE resetPhase runs. */
  finishedPhase: Phase;
  /**
   * sessionsCompleted AFTER incrementing for the focus session that just finished. The caller
   * must increment before calling this — passing the pre-increment value shifts the long-break
   * cadence by one session.
   */
  sessionsCompleted: number;
  sessionsUntilLongBreak: number;
}

export function nextPhase({ finishedPhase, sessionsCompleted, sessionsUntilLongBreak }: NextPhaseInput): Phase {
  if (finishedPhase === 'focus') {
    return sessionsCompleted % sessionsUntilLongBreak === 0 ? 'long' : 'short';
  }
  return 'focus';
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
