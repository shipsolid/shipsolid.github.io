// Pure standard 5-field cron parsing/description/scheduling logic — minute hour day-of-month
// month day-of-week. No DOM, no Date.now()/new Date() defaults; callers (cron-builder.astro) own
// supplying "now" so this module stays fully deterministic and testable.
//
// Deliberately out of scope: 6-field (seconds) cron and special strings like `@daily` — see
// cron-builder.astro's page-level docs for why the scope is capped at standard 5-field cron.
//
// nextRunTimes evaluates cron fields against UTC calendar components (getUTC*/setUTC*), not the
// host's local timezone. This is a deliberate, low-blast-radius assumption (matches how most
// cron-driven systems, e.g. Kubernetes CronJobs, default to UTC) that keeps tests fully
// deterministic regardless of the machine/CI timezone running them — a fixed `from` Date always
// produces the same matches everywhere. The page surfaces this to the user (see cron-builder.astro).

export interface CronValidationResult {
  valid: boolean;
  error: string | null;
}

interface FieldSpec {
  name: string;
  min: number;
  max: number;
}

const FIELD_SPECS: FieldSpec[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day-of-month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day-of-week', min: 0, max: 6 },
];

const DAY_OF_WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  '', // 1-indexed
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Expands a single cron field (e.g. "*", "1,15,30", "1-5", "*/15", "1-30/5") into the explicit
// set of allowed integer values within [min, max]. Throws a descriptive error on any syntactic
// problem — callers decide whether to surface that as a thrown Error (describeCron/nextRunTimes)
// or convert it into a {valid, error} result (validateCron).
function parseField(field: string, min: number, max: number, fieldName: string): Set<number> {
  const values = new Set<number>();

  const parts = field.split(',');
  for (const part of parts) {
    if (part === '') {
      throw new Error(`${fieldName} field has an empty term`);
    }

    let rangePart = part;
    let step = 1;

    if (part.includes('/')) {
      const stepSplit = part.split('/');
      if (stepSplit.length !== 2 || stepSplit[1] === '') {
        throw new Error(`${fieldName} field has an invalid step expression "${part}"`);
      }
      rangePart = stepSplit[0];
      const parsedStep = Number(stepSplit[1]);
      if (!Number.isInteger(parsedStep) || parsedStep <= 0 || !/^\d+$/.test(stepSplit[1])) {
        throw new Error(`${fieldName} field has an invalid step value "${stepSplit[1]}"`);
      }
      step = parsedStep;
    }

    let rangeMin: number;
    let rangeMax: number;

    if (rangePart === '*') {
      rangeMin = min;
      rangeMax = max;
    } else if (rangePart.includes('-')) {
      const rangeSplit = rangePart.split('-');
      if (rangeSplit.length !== 2 || rangeSplit[0] === '' || rangeSplit[1] === '') {
        throw new Error(`${fieldName} field has an invalid range "${rangePart}"`);
      }
      if (!/^\d+$/.test(rangeSplit[0]) || !/^\d+$/.test(rangeSplit[1])) {
        throw new Error(`${fieldName} field has a non-numeric range "${rangePart}"`);
      }
      rangeMin = Number(rangeSplit[0]);
      rangeMax = Number(rangeSplit[1]);
      if (rangeMin > rangeMax) {
        throw new Error(`${fieldName} field range "${rangePart}" has start greater than end`);
      }
    } else {
      if (!/^\d+$/.test(rangePart)) {
        throw new Error(`${fieldName} field has a non-numeric value "${rangePart}"`);
      }
      rangeMin = Number(rangePart);
      rangeMax = rangeMin;
    }

    if (rangeMin < min || rangeMax > max) {
      throw new Error(`${fieldName} field value "${rangePart}" is outside the allowed range ${min}-${max}`);
    }

    for (let v = rangeMin; v <= rangeMax; v += step) {
      values.add(v);
    }
  }

  return values;
}

export function validateCron(expr: string): CronValidationResult {
  const trimmed = expr.trim();
  if (trimmed === '') {
    return { valid: false, error: 'Cron expression cannot be empty' };
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    return {
      valid: false,
      error: `Expected exactly 5 fields (minute hour day-of-month month day-of-week), got ${fields.length}`,
    };
  }

  for (let i = 0; i < FIELD_SPECS.length; i++) {
    const spec = FIELD_SPECS[i];
    try {
      parseField(fields[i], spec.min, spec.max, spec.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: message };
    }
  }

  return { valid: true, error: null };
}

// Renders a single field as a human phrase fragment, e.g. "*" -> "every minute" is handled by the
// caller's phrasing scheme; this returns just the value list description, e.g. "0", "1,15,30",
// "*/15", "1-5". Kept simple/consistent rather than matching cron-descriptor's exact wording.
function describeField(field: string, allValues: Set<number>, min: number, max: number): { isEvery: boolean; isStep: boolean; step: number; values: number[] } {
  const values = [...allValues].sort((a, b) => a - b);
  const isEvery = values.length === max - min + 1;

  // Detect a plain step pattern (e.g. "*/15") for a friendlier "every N ..." phrasing.
  let isStep = false;
  let step = 0;
  if (field.startsWith('*/')) {
    const stepStr = field.slice(2);
    if (/^\d+$/.test(stepStr)) {
      isStep = true;
      step = Number(stepStr);
    }
  }

  return { isEvery, isStep, step, values };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function describeCron(expr: string): string {
  const validation = validateCron(expr);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid cron expression');
  }

  const fields = expr.trim().split(/\s+/);
  const [minuteField, hourField, domField, monthField, dowField] = fields;

  const minuteValues = parseField(minuteField, 0, 59, 'minute');
  const hourValues = parseField(hourField, 0, 23, 'hour');
  const domValues = parseField(domField, 1, 31, 'day-of-month');
  const monthValues = parseField(monthField, 1, 12, 'month');
  const dowValues = parseField(dowField, 0, 6, 'day-of-week');

  const minuteDesc = describeField(minuteField, minuteValues, 0, 59);
  const hourDesc = describeField(hourField, hourValues, 0, 23);
  const domDesc = describeField(domField, domValues, 1, 31);
  const monthDesc = describeField(monthField, monthValues, 1, 12);
  const dowDesc = describeField(dowField, dowValues, 0, 6);

  // Time-of-day / frequency clause.
  let timeClause: string;
  if (minuteDesc.isStep && hourDesc.isEvery) {
    timeClause = `Every ${minuteDesc.step} minute${minuteDesc.step === 1 ? '' : 's'}`;
  } else if (minuteDesc.isEvery && hourDesc.isEvery) {
    timeClause = 'Every minute';
  } else if (minuteDesc.isEvery && hourDesc.isStep) {
    timeClause = `Every minute, every ${hourDesc.step} hour${hourDesc.step === 1 ? '' : 's'}`;
  } else if (!minuteDesc.isEvery && hourDesc.isEvery) {
    // Fixed minute, every hour, e.g. "at minute 30 past every hour"
    const minuteList = minuteDesc.values.join(', ');
    timeClause = `At minute ${minuteList} past every hour`;
  } else {
    // Fixed minute(s) and hour(s) -> "At HH:MM[, HH:MM...]"
    const times: string[] = [];
    for (const h of hourDesc.values) {
      for (const m of minuteDesc.values) {
        times.push(`${pad2(h)}:${pad2(m)}`);
      }
    }
    timeClause = `At ${times.join(', ')}`;
  }

  // Day-of-month clause.
  let domClause = '';
  if (!domDesc.isEvery) {
    domClause = `on day ${domDesc.values.join(', ')} of the month`;
  }

  // Month clause.
  let monthClause = '';
  if (!monthDesc.isEvery) {
    monthClause = `in ${monthDesc.values.map((m) => MONTH_NAMES[m]).join(', ')}`;
  }

  // Day-of-week clause.
  let dowClause = '';
  if (!dowDesc.isEvery) {
    const sortedDow = dowDesc.values;
    // Detect a contiguous range for a "Monday through Friday" style phrase.
    const isContiguous = sortedDow.every((v, i) => i === 0 || v === sortedDow[i - 1] + 1);
    if (isContiguous && sortedDow.length > 1) {
      dowClause = `${DAY_OF_WEEK_NAMES[sortedDow[0]]} through ${DAY_OF_WEEK_NAMES[sortedDow[sortedDow.length - 1]]}`;
    } else {
      dowClause = sortedDow.map((d) => DAY_OF_WEEK_NAMES[d]).join(', ');
    }
  }

  const clauses = [timeClause];
  if (domClause) clauses.push(domClause);
  if (monthClause) clauses.push(monthClause);
  if (dowClause) clauses.push(dowClause);

  return clauses.join(', ');
}

const MAX_MINUTES_TO_SEARCH = 4 * 365 * 24 * 60; // ~4 years of minutes

export function nextRunTimes(expr: string, count: number, from: Date): Date[] {
  const validation = validateCron(expr);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid cron expression');
  }
  if (count <= 0) {
    return [];
  }

  const fields = expr.trim().split(/\s+/);
  const [minuteField, hourField, domField, monthField, dowField] = fields;

  const minuteValues = parseField(minuteField, 0, 59, 'minute');
  const hourValues = parseField(hourField, 0, 23, 'hour');
  const domValues = parseField(domField, 1, 31, 'day-of-month');
  const monthValues = parseField(monthField, 1, 12, 'month');
  const dowValues = parseField(dowField, 0, 6, 'day-of-week');

  // Round up to the next full minute strictly after `from`, all in UTC (see module header).
  const cursor = new Date(from.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  const results: Date[] = [];
  let iterations = 0;

  while (results.length < count) {
    if (iterations >= MAX_MINUTES_TO_SEARCH) {
      throw new Error(
        `No match found for cron expression "${expr}" within ${MAX_MINUTES_TO_SEARCH} minutes (~4 years) — the expression may be unsatisfiable`
      );
    }
    iterations++;

    const minute = cursor.getUTCMinutes();
    const hour = cursor.getUTCHours();
    const dom = cursor.getUTCDate();
    const month = cursor.getUTCMonth() + 1;
    const dow = cursor.getUTCDay();

    if (
      minuteValues.has(minute) &&
      hourValues.has(hour) &&
      domValues.has(dom) &&
      monthValues.has(month) &&
      dowValues.has(dow)
    ) {
      results.push(new Date(cursor.getTime()));
    }

    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }

  return results;
}
