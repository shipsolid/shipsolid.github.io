import { describe, expect, it } from 'vitest';
import { buildQuery, buildUrl, decodeComponent, encodeComponent, parseUrl } from './url-toolkit';

describe('encode / decode', () => {
  it('round-trips spaces, unicode, and reserved characters', () => {
    for (const raw of ['a b c', 'café & crème', 'k=v&x=y', '日本語', '100%']) {
      expect(decodeComponent(encodeComponent(raw))).toBe(raw);
    }
    expect(encodeComponent('a b')).toBe('a%20b');
  });

  it('throws on invalid percent-encoding', () => {
    expect(() => decodeComponent('%zz')).toThrow(/Invalid percent-encoding/);
    expect(() => decodeComponent('%E0%A4')).toThrow(/Invalid percent-encoding/);
  });
});

describe('parseUrl', () => {
  it('breaks a URL into parts and keeps duplicate query keys in order', () => {
    const parsed = parseUrl('https://api.example.com:8443/v1/orders?x=1&x=2&y=3#section');
    expect(parsed.protocol).toBe('https');
    expect(parsed.host).toBe('api.example.com');
    expect(parsed.port).toBe('8443');
    expect(parsed.pathname).toBe('/v1/orders');
    expect(parsed.hash).toBe('section');
    expect(parsed.params).toEqual([
      { key: 'x', value: '1' },
      { key: 'x', value: '2' },
      { key: 'y', value: '3' },
    ]);
  });

  it('decodes percent-encoded query values', () => {
    const parsed = parseUrl('https://x.test/?q=a%20b%26c');
    expect(parsed.params).toEqual([{ key: 'q', value: 'a b&c' }]);
  });

  it('throws on a non-absolute / malformed URL', () => {
    expect(() => parseUrl('not a url')).toThrow(/Not a valid absolute URL/);
    expect(() => parseUrl('/relative/path')).toThrow(/Not a valid absolute URL/);
  });
});

describe('buildQuery / buildUrl', () => {
  it('skips blank keys, keeps order, and encodes values', () => {
    const qs = buildQuery([
      { key: 'a', value: '1' },
      { key: '', value: 'ignored' },
      { key: 'b', value: 'x y' },
      { key: 'a', value: '2' },
    ]);
    expect(qs).toBe('a=1&b=x+y&a=2');
  });

  it('replaces the query on a base URL', () => {
    const url = buildUrl('https://x.test/path?old=1', [{ key: 'new', value: 'v' }]);
    expect(url).toBe('https://x.test/path?new=v');
  });

  it('throws when the base URL is invalid', () => {
    expect(() => buildUrl('nope', [])).toThrow(/Not a valid absolute URL/);
  });
});
