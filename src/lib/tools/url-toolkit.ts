// Pure URL helpers built on the platform URL / URLSearchParams APIs. No DOM, no localStorage.

export function encodeComponent(input: string): string {
  return encodeURIComponent(input);
}

export function decodeComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    throw new Error(`Invalid percent-encoding: ${input}`);
  }
}

export interface QueryParam {
  key: string;
  value: string;
}

export interface ParsedUrl {
  protocol: string;
  host: string;
  port: string;
  pathname: string;
  params: QueryParam[];
  hash: string;
}

export function parseUrl(input: string): ParsedUrl {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(`Not a valid absolute URL: "${input}"`);
  }

  const params: QueryParam[] = [];
  // forEach preserves insertion order and keeps duplicate keys.
  url.searchParams.forEach((value, key) => params.push({ key, value }));

  return {
    protocol: url.protocol.replace(/:$/, ''),
    host: url.hostname,
    port: url.port,
    pathname: url.pathname,
    params,
    hash: url.hash.replace(/^#/, ''),
  };
}

// Blank keys are dropped; order and duplicates are preserved; values are percent-encoded.
export function buildQuery(params: QueryParam[]): string {
  const sp = new URLSearchParams();
  for (const { key, value } of params) {
    if (key.trim() === '') continue;
    sp.append(key, value);
  }
  return sp.toString();
}

// Replaces `base`'s query string entirely with the supplied params. Throws on an invalid base.
export function buildUrl(base: string, params: QueryParam[]): string {
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    throw new Error(`Not a valid absolute URL: "${base}"`);
  }
  url.search = buildQuery(params);
  return url.toString();
}
