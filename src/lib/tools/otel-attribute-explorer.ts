// Pure OpenTelemetry attribute classifier — group attributes by the signal scope they belong to
// (resource / scope / span / metric) and flag the ones that are unsafe as metric labels. No DOM,
// no localStorage.

export type OtelScope = 'resource' | 'scope' | 'span' | 'metric' | 'unknown';
export type CardinalityRisk = 'low' | 'medium' | 'high';

export interface AttrPair {
  key: string;
  value: string;
}

export interface ClassifiedAttr {
  key: string;
  value: string;
  scope: OtelScope;
  highCardinalityRisk: CardinalityRisk;
  note: string;
}

// Accepts a JSON object, `key=value` lines, or `key: value` lines. Throws when nothing parses.
export function parseAttributeText(text: string): AttrPair[] {
  const trimmed = text.trim();
  if (trimmed === '') {
    throw new Error('Could not parse attributes — paste JSON or key=value lines');
  }

  // JSON object first.
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const pairs = Object.entries(parsed).map(([key, value]) => ({
        key: key.trim(),
        value: value === null || value === undefined ? '' : String(value),
      }));
      if (pairs.length > 0) return pairs;
    }
  } catch {
    // not JSON — fall through to line parsing
  }

  const pairs: AttrPair[] = [];
  for (const rawLine of trimmed.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '');
    if (line === '' || line.startsWith('#') || line.startsWith('//')) continue;
    const match = line.match(/^["']?([^"'=:]+?)["']?\s*[=:]\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key !== '') pairs.push({ key, value });
  }

  if (pairs.length === 0) {
    throw new Error('Could not parse attributes — paste JSON or key=value lines');
  }
  return pairs;
}

const RESOURCE_PREFIXES = [
  'service.',
  'deployment.',
  'cloud.',
  'k8s.',
  'host.',
  'os.',
  'process.',
  'container.',
  'telemetry.sdk',
  'telemetry.distro',
  'faas.',
  'device.',
  'webengine.',
];
const SCOPE_PREFIXES = ['otel.scope.', 'otel.library.'];
const SPAN_PREFIXES = [
  'http.',
  'rpc.',
  'db.',
  'messaging.',
  'url.',
  'network.',
  'net.',
  'exception.',
  'server.',
  'client.',
  'user_agent.',
  'graphql.',
  'aws.',
  'gcp.',
  'code.',
  'thread.',
  'enduser.',
  'feature_flag.',
];

// Attributes that are safe as a metric label despite matching a broader risk pattern.
// (service.instance.id is deliberately absent — per-instance labels are a classic cardinality trap.)
const LOW_ALLOWLIST = new Set([
  'service.name',
  'service.namespace',
  'service.version',
  'deployment.environment',
  'deployment.environment.name',
  'cloud.region',
  'cloud.provider',
  'cloud.platform',
  'cloud.availability_zone',
  'k8s.namespace.name',
  'k8s.cluster.name',
  'k8s.deployment.name',
  'telemetry.sdk.name',
  'telemetry.sdk.language',
  'http.request.method',
  'http.response.status_code',
  'rpc.system',
  'rpc.method',
  'db.system',
  'messaging.system',
  'network.protocol.name',
  'network.transport',
  'span.kind',
]);

const HIGH_RE =
  /(^|[._])(id|uuid|guid|token|secret|session|sessionid|user|username|userid|email|ip|ipaddr|correlation|traceid|spanid|requestid|nonce)([._]|$)|\.(path|target|full|query|statement|stacktrace|filepath|lineno|payload)$|url\.full|user_agent\.original|exception\.(message|stacktrace)|db\.statement|http\.target|process\.command_line/i;

const MEDIUM_RE =
  /\.(route|operation|destination|namespace|address|name)$|http\.route|net\.peer\.name|k8s\.(pod|node|replicaset)\.name|host\.name|container\.name|code\.function|db\.name/i;

function classifyScope(key: string): OtelScope {
  if (SCOPE_PREFIXES.some((p) => key.startsWith(p))) return 'scope';
  if (RESOURCE_PREFIXES.some((p) => key.startsWith(p))) return 'resource';
  if (SPAN_PREFIXES.some((p) => key.startsWith(p))) return 'span';
  if (key.startsWith('metric.')) return 'metric';
  return 'unknown';
}

function classifyRisk(key: string): CardinalityRisk {
  if (LOW_ALLOWLIST.has(key)) return 'low';
  if (HIGH_RE.test(key)) return 'high';
  if (MEDIUM_RE.test(key)) return 'medium';
  return 'low';
}

const RISK_NOTE: Record<CardinalityRisk, string> = {
  low: 'Low cardinality — safe as a metric label.',
  medium: 'Moderate cardinality — fine on spans and logs, risky as a metric label at scale.',
  high: 'High / unbounded cardinality — keep off metric labels. Use it as a span or log attribute, or an exemplar.',
};

export function classifyAttributes(pairs: AttrPair[]): ClassifiedAttr[] {
  return pairs.map(({ key, value }) => {
    const risk = classifyRisk(key);
    return {
      key,
      value,
      scope: classifyScope(key),
      highCardinalityRisk: risk,
      note: RISK_NOTE[risk],
    };
  });
}
