import { describe, expect, it } from 'vitest';
import { decodeJwt } from './jwt-inspector';

// Base64url-encodes an arbitrary object as a JWT segment, mirroring what a real JWT library
// would produce — including correct handling of multi-byte UTF-8 content, so round-tripping
// through decodeJwt's TextDecoder-based path is actually exercised.
function encodeSegment(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeToken(header: unknown, payload: unknown, signature = 'sig'): string {
  return `${encodeSegment(header)}.${encodeSegment(payload)}.${signature}`;
}

const JWT_IO_EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('decodeJwt', () => {
  it('decodes the classic jwt.io example header and payload', () => {
    const result = decodeJwt(JWT_IO_EXAMPLE);
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(result.payload).toEqual({ sub: '1234567890', name: 'John Doe', iat: 1516239022 });
    expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    expect(result.issuedAt).toEqual(new Date(1516239022 * 1000));
  });

  it('marks a token with an exp far in the past as expired', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 100000;
    const token = makeToken({ alg: 'HS256', typ: 'JWT' }, { sub: 'abc', exp: pastExp });
    const result = decodeJwt(token);
    expect(result.expiresAt).toEqual(new Date(pastExp * 1000));
    expect(result.isExpired).toBe(true);
  });

  it('marks a token with an exp far in the future as not expired', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 100000;
    const token = makeToken({ alg: 'HS256', typ: 'JWT' }, { sub: 'abc', exp: futureExp });
    const result = decodeJwt(token);
    expect(result.expiresAt).toEqual(new Date(futureExp * 1000));
    expect(result.isExpired).toBe(false);
  });

  it('returns null expiresAt/isExpired when there is no exp claim', () => {
    const token = makeToken({ alg: 'HS256', typ: 'JWT' }, { sub: 'abc' });
    const result = decodeJwt(token);
    expect(result.expiresAt).toBeNull();
    expect(result.isExpired).toBeNull();
    expect(result.issuedAt).toBeNull();
  });

  it('correctly decodes multi-byte UTF-8 payload content', () => {
    const token = makeToken({ alg: 'HS256', typ: 'JWT' }, { name: 'Amit Singh — 日本語' });
    const result = decodeJwt(token);
    expect(result.payload.name).toBe('Amit Singh — 日本語');
  });

  it('throws for a malformed token with the wrong segment count', () => {
    expect(() => decodeJwt('only.two')).toThrow(/expected 3 dot-separated segments, got 2/);
    expect(() => decodeJwt('one')).toThrow(/expected 3 dot-separated segments, got 1/);
  });

  it('throws for invalid base64/JSON in a segment', () => {
    expect(() => decodeJwt('not-valid-base64!!.not-valid-base64!!.sig')).toThrow();
    // Valid base64url, but not valid JSON once decoded.
    const notJson = btoa('not json').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(() => decodeJwt(`${notJson}.${notJson}.sig`)).toThrow(/not valid JSON/);
  });
});
