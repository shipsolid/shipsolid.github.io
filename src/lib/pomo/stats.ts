// Pure stats/streak/achievement math for the Pomodoro engine. See engine.ts for the equivalent
// note on why this is parameterized rather than closing over mutable module state.

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface PomoStats {
  v: 1;
  totalSessions: number;
  totalFocusMinutes: number;
  currentStreak: number;
  bestStreak: number;
  bestDaySessions: number;
  bestDayMinutes: number;
  lastSessionDate: string | null;
  dailyLog: Record<string, number>;
}

export const MAX_DAILY_LOG_DAYS = 60;

export function trimDailyLog(dailyLog: Record<string, number>): Record<string, number> {
  const keys = Object.keys(dailyLog).sort();
  if (keys.length <= MAX_DAILY_LOG_DAYS) return dailyLog;
  const trimmed = { ...dailyLog };
  for (const key of keys.slice(0, keys.length - MAX_DAILY_LOG_DAYS)) delete trimmed[key];
  return trimmed;
}

export function computeUpdatedStreak(lastSessionDate: string | null, currentStreak: number, today: string): number {
  if (!lastSessionDate || lastSessionDate === today) return currentStreak || 1;
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (new Date(`${today}T00:00:00`).getTime() - new Date(`${lastSessionDate}T00:00:00`).getTime()) / dayMs
  );
  return diffDays === 1 ? currentStreak + 1 : 1;
}

export interface RecordFocusSessionInput {
  stats: PomoStats;
  today: string;
  focusMin: number;
}

// Ordering matters and mirrors the original imperative version exactly: bump today's count, trim
// the log, THEN compute the streak off the (still old) lastSessionDate, THEN bestStreak off the
// freshly-computed streak, THEN best-day figures off the post-trim count (today's own entry is
// never the one trimmed, since trimming only ever drops the oldest keys).
export function recordFocusSession({ stats, today, focusMin }: RecordFocusSessionInput): PomoStats {
  const totalSessions = stats.totalSessions + 1;
  const totalFocusMinutes = stats.totalFocusMinutes + focusMin;
  const dailyLog = trimDailyLog({ ...stats.dailyLog, [today]: (stats.dailyLog[today] || 0) + 1 });
  const currentStreak = computeUpdatedStreak(stats.lastSessionDate, stats.currentStreak, today);
  const bestStreak = Math.max(stats.bestStreak, currentStreak);
  const todayCount = dailyLog[today] ?? 0;
  const bestDaySessions = Math.max(stats.bestDaySessions, todayCount);
  const bestDayMinutes = Math.max(stats.bestDayMinutes, todayCount * focusMin);

  return {
    ...stats,
    totalSessions,
    totalFocusMinutes,
    dailyLog,
    currentStreak,
    lastSessionDate: today,
    bestStreak,
    bestDaySessions,
    bestDayMinutes,
  };
}

export interface Achievement {
  icon: string;
  label: string;
  desc: string;
  check: (stats: PomoStats) => boolean;
}

// Unlock state is always derived live from `stats` (no stored unlocked flags), so it can never
// desync — see renderAchievements() in pomo.astro.
export const ACHIEVEMENTS: Achievement[] = [
  { icon: '🌱', label: 'First Step', desc: 'Complete 1 session', check: (s) => s.totalSessions >= 1 },
  { icon: '⚡', label: 'Getting Going', desc: '10 sessions total', check: (s) => s.totalSessions >= 10 },
  { icon: '🔥', label: 'On Fire', desc: '50 sessions total', check: (s) => s.totalSessions >= 50 },
  { icon: '💯', label: 'Centurion', desc: '100 sessions total', check: (s) => s.totalSessions >= 100 },
  { icon: '🚀', label: 'Unstoppable', desc: '500 sessions total', check: (s) => s.totalSessions >= 500 },
  { icon: '📅', label: 'Consistent', desc: '3-day streak', check: (s) => s.bestStreak >= 3 },
  { icon: '🏆', label: 'Week Warrior', desc: '7-day streak', check: (s) => s.bestStreak >= 7 },
  { icon: '👑', label: 'Legendary', desc: '30-day streak', check: (s) => s.bestStreak >= 30 },
  { icon: '🧠', label: 'Deep Work', desc: '5 sessions in one day', check: (s) => s.bestDaySessions >= 5 },
  { icon: '🦁', label: 'Marathon', desc: '10 sessions in one day', check: (s) => s.bestDaySessions >= 10 },
  { icon: '⏰', label: 'Hour Down', desc: '60 min focused in a day', check: (s) => s.bestDayMinutes >= 60 },
  { icon: '✨', label: 'Flow Master', desc: '4 hrs focused in a day', check: (s) => s.bestDayMinutes >= 240 },
];
