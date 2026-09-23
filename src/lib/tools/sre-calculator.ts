// Pure SRE math — error budgets, burn rate, Apdex, and MTTR/MTBF. No DOM, no localStorage;
// callers (sre-calculator.astro) own reading inputs/persisting state and just pass plain numbers
// in, same separation as ../pomo/engine.ts.

export interface ErrorBudgetResult {
  windowMinutes: number;
  allowedDowntimeMinutes: number;
  remainingBudgetMinutes: number | null; // null if actualDowntimeMinutes not provided
  percentConsumed: number | null;
}

export function calcErrorBudget(
  sloPercent: number,
  windowDays: number,
  actualDowntimeMinutes?: number
): ErrorBudgetResult {
  if (sloPercent <= 0 || sloPercent >= 100) {
    throw new Error(`sloPercent must be between 0 and 100 (exclusive), got ${sloPercent}`);
  }
  if (windowDays <= 0) {
    throw new Error(`windowDays must be greater than 0, got ${windowDays}`);
  }

  const windowMinutes = windowDays * 24 * 60;
  const allowedDowntimeMinutes = windowMinutes * (1 - sloPercent / 100);

  const hasActual = actualDowntimeMinutes !== undefined;
  return {
    windowMinutes,
    allowedDowntimeMinutes,
    remainingBudgetMinutes: hasActual ? allowedDowntimeMinutes - actualDowntimeMinutes! : null,
    percentConsumed: hasActual ? (actualDowntimeMinutes! / allowedDowntimeMinutes) * 100 : null,
  };
}

export interface BurnRateResult {
  burnRate: number; // e.g. 2.5 means burning 2.5x the sustainable rate
  daysToExhaustBudget: number; // windowDays / burnRate
}

export function calcBurnRate(sloPercent: number, observedErrorRatePercent: number, windowDays: number): BurnRateResult {
  if (sloPercent <= 0 || sloPercent >= 100) {
    throw new Error(`sloPercent must be between 0 and 100 (exclusive), got ${sloPercent}`);
  }

  const burnRate = (observedErrorRatePercent / 100) / (1 - sloPercent / 100);
  return {
    burnRate,
    daysToExhaustBudget: burnRate === 0 ? Infinity : windowDays / burnRate,
  };
}

export type ApdexRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unacceptable';

export interface ApdexResult {
  score: number;
  rating: ApdexRating;
}

export function calcApdex(satisfiedCount: number, toleratingCount: number, totalCount: number): ApdexResult {
  if (totalCount <= 0) {
    throw new Error(`totalCount must be greater than 0, got ${totalCount}`);
  }
  if (satisfiedCount + toleratingCount > totalCount) {
    throw new Error(
      `satisfiedCount + toleratingCount (${satisfiedCount + toleratingCount}) cannot exceed totalCount (${totalCount})`
    );
  }

  const rawScore = (satisfiedCount + toleratingCount / 2) / totalCount;
  const score = Math.round(rawScore * 100) / 100;

  let rating: ApdexRating;
  if (score >= 0.94) rating = 'Excellent';
  else if (score >= 0.85) rating = 'Good';
  else if (score >= 0.7) rating = 'Fair';
  else if (score >= 0.5) rating = 'Poor';
  else rating = 'Unacceptable';

  return { score, rating };
}

export interface ReliabilityResult {
  mttrMinutes: number;
  mtbfMinutes: number;
  availabilityPercent: number;
}

export function calcMttrMtbf(incidentDowntimeMinutes: number[], totalObservationMinutes: number): ReliabilityResult {
  if (totalObservationMinutes <= 0) {
    throw new Error(`totalObservationMinutes must be greater than 0, got ${totalObservationMinutes}`);
  }

  const incidentCount = incidentDowntimeMinutes.length;
  const totalDowntime = incidentDowntimeMinutes.reduce((sum, minutes) => sum + minutes, 0);

  const mttrMinutes = incidentCount === 0 ? 0 : totalDowntime / incidentCount;
  const mtbfMinutes = incidentCount === 0 ? Infinity : (totalObservationMinutes - totalDowntime) / incidentCount;
  const availabilityPercent = ((totalObservationMinutes - totalDowntime) / totalObservationMinutes) * 100;

  return { mttrMinutes, mtbfMinutes, availabilityPercent };
}

// Formats a minute count as a human string — day/hour/minute-scale durations drop seconds
// entirely (e.g. "1d 1h 0m"), sub-hour durations show minutes+seconds (e.g. "21m 36s"), and
// sub-minute durations collapse to seconds alone (e.g. "36s"). Infinity (e.g. an unbounded MTBF
// from zero incidents) renders as "∞" rather than a nonsensical numeric string.
export function formatDuration(minutes: number): string {
  if (!isFinite(minutes)) return '∞';

  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
