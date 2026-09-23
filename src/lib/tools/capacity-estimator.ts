// Pure back-of-the-envelope capacity math for system-design sizing — DAU and a peak multiplier in,
// QPS / bandwidth / storage / server count out. No DOM, no localStorage. Optional outputs are null
// when the inputs they need are not supplied.

export interface CapacityInput {
  dau: number;
  requestsPerUserPerDay: number;
  /** Peak-to-average ratio. Must be >= 1. */
  peakMultiplier: number;
  avgResponseBytes?: number;
  bytesStoredPerRequest?: number;
  replicationFactor?: number;
  serverCapacityRps?: number;
  retentionDays?: number;
}

export interface CapacityResult {
  dailyRequests: number;
  averageRps: number;
  peakRps: number;
  peakBandwidthMbps: number | null;
  storagePerDayGb: number | null;
  storageAtRetentionGb: number | null;
  estimatedServers: number | null;
  notes: string[];
}

const SECONDS_PER_DAY = 86_400;

export function estimateCapacity(input: CapacityInput): CapacityResult {
  const { dau, requestsPerUserPerDay, peakMultiplier } = input;

  for (const [field, value] of [
    ['dau', dau],
    ['requestsPerUserPerDay', requestsPerUserPerDay],
    ['peakMultiplier', peakMultiplier],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${field} must be a number >= 0, got ${value}`);
    }
  }
  if (peakMultiplier < 1) {
    throw new Error(`peakMultiplier must be >= 1, got ${peakMultiplier}`);
  }
  if (input.serverCapacityRps !== undefined && (!Number.isFinite(input.serverCapacityRps) || input.serverCapacityRps <= 0)) {
    throw new Error(`serverCapacityRps must be greater than 0, got ${input.serverCapacityRps}`);
  }
  for (const field of ['avgResponseBytes', 'bytesStoredPerRequest', 'replicationFactor', 'retentionDays'] as const) {
    const value = input[field];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${field} must be a number >= 0, got ${value}`);
    }
  }

  const dailyRequests = dau * requestsPerUserPerDay;
  const averageRps = dailyRequests / SECONDS_PER_DAY;
  const peakRps = averageRps * peakMultiplier;

  const peakBandwidthMbps =
    input.avgResponseBytes !== undefined ? (peakRps * input.avgResponseBytes * 8) / 1_000_000 : null;

  const replication = input.replicationFactor ?? 1;
  const storagePerDayGb =
    input.bytesStoredPerRequest !== undefined
      ? (dailyRequests * input.bytesStoredPerRequest * replication) / 1_000_000_000
      : null;

  const storageAtRetentionGb =
    storagePerDayGb !== null && input.retentionDays !== undefined
      ? storagePerDayGb * input.retentionDays
      : null;

  const estimatedServers =
    input.serverCapacityRps !== undefined ? Math.ceil(peakRps / input.serverCapacityRps) : null;

  const notes: string[] = [
    `Daily requests = DAU × requests/user/day = ${dailyRequests.toLocaleString()}.`,
    `Average QPS = daily requests ÷ ${SECONDS_PER_DAY.toLocaleString()}s. Peak QPS = average × ${peakMultiplier}.`,
  ];
  if (peakBandwidthMbps === null) notes.push('Add an average response size to estimate peak bandwidth.');
  if (storagePerDayGb === null) notes.push('Add bytes stored per request to estimate storage growth.');
  else notes.push(`Storage/day uses a replication factor of ${replication}.`);
  if (storageAtRetentionGb === null && storagePerDayGb !== null) notes.push('Add a retention window to project total storage.');
  if (estimatedServers === null) notes.push('Add a per-server RPS capacity to estimate the server count.');

  return {
    dailyRequests,
    averageRps,
    peakRps,
    peakBandwidthMbps,
    storagePerDayGb,
    storageAtRetentionGb,
    estimatedServers,
    notes,
  };
}
