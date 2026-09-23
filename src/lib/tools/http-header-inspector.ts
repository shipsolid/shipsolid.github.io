// Pure parsing/checking logic for the HTTP header inspector tool. No DOM — the page owns
// rendering (and must escapeHtml everything from parseHeaders before it hits innerHTML).

export interface HttpHeader {
  name: string;
  value: string;
}

const STATUS_LINE_RE = /^HTTP\/\d/i;

// A request/status leading line either matches the HTTP/<version> status-line shape, or looks
// like a request line ("GET /path HTTP/1.1") — i.e. it has no colon at all before the first
// space, or no colon at all in the line. Real header lines always have a `name:` prefix before
// any spaces in the name portion, so "no colon before the first space" is a reasonably robust
// discriminator without needing a method allowlist.
function isLeadingLine(line: string): boolean {
  if (STATUS_LINE_RE.test(line)) return true;

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return true; // no colon at all — can't be "name: value"

  const firstSpaceIndex = line.indexOf(' ');
  if (firstSpaceIndex !== -1 && firstSpaceIndex < colonIndex) {
    // e.g. "GET /path HTTP/1.1" — a space appears before any colon, so the part before the
    // colon isn't a plausible header name.
    return true;
  }

  return false;
}

export function parseHeaders(raw: string): HttpHeader[] {
  const lines = raw.split(/\r\n|\n/);
  const headers: HttpHeader[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (isLeadingLine(line)) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue; // defensive; isLeadingLine already filters this case

    const name = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (name === '') continue;

    headers.push({ name, value });
  }

  return headers;
}

export interface SecurityHeaderCheck {
  name: string;
  present: boolean;
  value: string | null;
  note: string;
}

const SECURITY_HEADER_CHECKS: Array<{ name: string; note: string }> = [
  {
    name: 'Strict-Transport-Security',
    note: 'Enforces HTTPS; missing allows protocol downgrade attacks',
  },
  {
    name: 'Content-Security-Policy',
    note: 'Mitigates XSS and data injection by restricting resource origins',
  },
  {
    name: 'X-Content-Type-Options',
    note: "Should be 'nosniff' to prevent MIME-sniffing attacks",
  },
  {
    name: 'X-Frame-Options',
    note: 'Prevents clickjacking via iframe embedding; consider CSP frame-ancestors instead',
  },
  {
    name: 'Referrer-Policy',
    note: 'Controls how much referrer info leaks to other origins',
  },
];

export function checkSecurityHeaders(headers: HttpHeader[]): SecurityHeaderCheck[] {
  return SECURITY_HEADER_CHECKS.map(({ name, note }) => {
    const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return {
      name,
      present: found !== undefined,
      value: found ? found.value : null,
      note,
    };
  });
}
