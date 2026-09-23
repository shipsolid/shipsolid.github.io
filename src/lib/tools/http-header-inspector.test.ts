import { describe, expect, it } from 'vitest';
import { checkSecurityHeaders, parseHeaders } from './http-header-inspector';

describe('parseHeaders', () => {
  it('parses realistic curl -I output, excluding the status line and blank lines', () => {
    const raw = [
      'HTTP/1.1 200 OK',
      'Date: Mon, 01 Jan 2026 00:00:00 GMT',
      'Content-Type: text/html; charset=utf-8',
      'Content-Length: 1256',
      'Location: https://example.com:8443/path',
      '',
      'Server: nginx',
      '',
    ].join('\r\n');

    const headers = parseHeaders(raw);

    expect(headers).toEqual([
      { name: 'Date', value: 'Mon, 01 Jan 2026 00:00:00 GMT' },
      { name: 'Content-Type', value: 'text/html; charset=utf-8' },
      { name: 'Content-Length', value: '1256' },
      { name: 'Location', value: 'https://example.com:8443/path' },
      { name: 'Server', value: 'nginx' },
    ]);
  });

  it('splits only on the first colon so header values containing colons stay intact', () => {
    const headers = parseHeaders('Date: Mon, 01 Jan 2026 00:00:00 GMT');
    expect(headers).toEqual([{ name: 'Date', value: 'Mon, 01 Jan 2026 00:00:00 GMT' }]);
  });

  it('excludes a leading request line', () => {
    const raw = 'GET /path HTTP/1.1\nHost: example.com\n';
    const headers = parseHeaders(raw);
    expect(headers).toEqual([{ name: 'Host', value: 'example.com' }]);
  });

  it('handles \\n-only line endings', () => {
    const raw = 'HTTP/1.1 200 OK\nContent-Type: text/plain\n\n';
    const headers = parseHeaders(raw);
    expect(headers).toEqual([{ name: 'Content-Type', value: 'text/plain' }]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseHeaders('')).toEqual([]);
    expect(parseHeaders('\n\n\r\n')).toEqual([]);
  });
});

describe('checkSecurityHeaders', () => {
  it('reports present headers with their value and missing headers as null, in fixed order', () => {
    const headers = parseHeaders(
      ['content-security-policy: default-src \'self\'', 'X-Frame-Options: DENY'].join('\n')
    );

    const result = checkSecurityHeaders(headers);

    expect(result.map((r) => r.name)).toEqual([
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
    ]);

    const csp = result.find((r) => r.name === 'Content-Security-Policy');
    expect(csp?.present).toBe(true);
    expect(csp?.value).toBe("default-src 'self'");

    const xfo = result.find((r) => r.name === 'X-Frame-Options');
    expect(xfo?.present).toBe(true);
    expect(xfo?.value).toBe('DENY');

    const hsts = result.find((r) => r.name === 'Strict-Transport-Security');
    expect(hsts?.present).toBe(false);
    expect(hsts?.value).toBeNull();

    const xcto = result.find((r) => r.name === 'X-Content-Type-Options');
    expect(xcto?.present).toBe(false);

    const referrer = result.find((r) => r.name === 'Referrer-Policy');
    expect(referrer?.present).toBe(false);
  });

  it('includes the expected note text for each check', () => {
    const result = checkSecurityHeaders([]);
    expect(result.find((r) => r.name === 'Strict-Transport-Security')?.note).toBe(
      'Enforces HTTPS; missing allows protocol downgrade attacks'
    );
    expect(result.find((r) => r.name === 'X-Content-Type-Options')?.note).toBe(
      "Should be 'nosniff' to prevent MIME-sniffing attacks"
    );
  });

  it('returns all-missing when given no headers', () => {
    const result = checkSecurityHeaders([]);
    expect(result.every((r) => r.present === false && r.value === null)).toBe(true);
  });
});
