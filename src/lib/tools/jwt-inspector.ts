// Pure JWT decode-only helpers. No DOM, no localStorage, no signature verification — the caller
// (jwt-inspector.astro) owns reading the pasted token and rendering the result. Deliberately does
// NOT persist the token anywhere (see the .astro script for the storage-skip rationale).

// Converts a base64url segment (RFC 4648 §5 — `-`/`_` instead of `+`/`/`, no padding) to a UTF-8
// string. Padding is restored before atob, and the resulting binary string is walked byte-by-byte
// into a Uint8Array so TextDecoder can correctly reassemble multi-byte UTF-8 sequences (a plain
// atob() result treated as a JS string would mangle any non-ASCII claim value).
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  if (paddingNeeded === 3) {
    throw new Error(`Invalid base64url segment length: ${str.length}`);
  }

  let binary: string;
  try {
    binary = atob(base64 + '='.repeat(paddingNeeded));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid base64url encoding: ${message}`);
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function decodeJsonSegment(segment: string, name: string): Record<string, unknown> {
  const decoded = base64UrlDecode(segment);
  try {
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JWT: ${name} segment is not valid JSON (${message})`);
  }
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  issuedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean | null;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT: expected 3 dot-separated segments, got ${parts.length}`);
  }

  const [headerSegment, payloadSegment, signature] = parts;
  const header = decodeJsonSegment(headerSegment, 'header');
  const payload = decodeJsonSegment(payloadSegment, 'payload');

  const issuedAt = typeof payload.iat === 'number' ? new Date(payload.iat * 1000) : null;
  const expiresAt = typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null;
  const isExpired = expiresAt === null ? null : expiresAt.getTime() < Date.now();

  return { header, payload, signature, issuedAt, expiresAt, isExpired };
}
