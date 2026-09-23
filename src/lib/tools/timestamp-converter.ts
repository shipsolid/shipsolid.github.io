// Pure unix-timestamp / ISO-8601 / timezone / relative-time conversions. No DOM, no
// Date.now()/new Date() defaults — callers (timestamp-converter.astro) own supplying "now" so this
// module stays fully deterministic and testable.

export function unixToIso(unixSeconds: number): string {
  if (typeof unixSeconds !== 'number' || !isFinite(unixSeconds)) {
    throw new Error(`unixSeconds must be a finite number, got ${unixSeconds}`);
  }
  return new Date(unixSeconds * 1000).toISOString();
}

export function isoToUnix(iso: string): number {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    throw new Error(`"${iso}" is not a valid ISO 8601 date string`);
  }
  return Math.floor(date.getTime() / 1000);
}

export function formatTimestamp(unixSeconds: number, timeZone: string): string {
  if (typeof unixSeconds !== 'number' || !isFinite(unixSeconds)) {
    throw new Error(`unixSeconds must be a finite number, got ${unixSeconds}`);
  }

  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone,
      dateStyle: 'full',
      timeStyle: 'long',
    });
    return formatter.format(new Date(unixSeconds * 1000));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid IANA time zone "${timeZone}": ${message}`);
  }
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 12 * MONTH;

// Approximate, threshold-based relative time — good enough for a utility tool, not
// calendar-aware (a "month" is a flat 30 days, a "year" a flat 12 months).
export function relativeTime(unixSeconds: number, nowSeconds: number): string {
  const deltaSeconds = unixSeconds - nowSeconds;
  const absDelta = Math.abs(deltaSeconds);

  if (absDelta < 10) {
    return 'just now';
  }

  const isFuture = deltaSeconds > 0;

  let amount: number;
  let unit: string;

  if (absDelta < MINUTE) {
    amount = Math.round(absDelta);
    unit = 'second';
  } else if (absDelta < HOUR) {
    amount = Math.round(absDelta / MINUTE);
    unit = 'minute';
  } else if (absDelta < DAY) {
    amount = Math.round(absDelta / HOUR);
    unit = 'hour';
  } else if (absDelta < MONTH) {
    amount = Math.round(absDelta / DAY);
    unit = 'day';
  } else if (absDelta < YEAR) {
    amount = Math.round(absDelta / MONTH);
    unit = 'month';
  } else {
    amount = Math.round(absDelta / YEAR);
    unit = 'year';
  }

  const plural = amount === 1 ? unit : `${unit}s`;
  return isFuture ? `in ${amount} ${plural}` : `${amount} ${plural} ago`;
}
