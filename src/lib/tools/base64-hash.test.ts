import { describe, expect, it } from 'vitest';
import { decodeBase64, encodeBase64, hashHex } from './base64-hash';

describe('encodeBase64 / decodeBase64', () => {
  it('round-trips plain ASCII text', () => {
    const original = 'The quick brown fox jumps over the lazy dog.';
    const encoded = encodeBase64(original);
    expect(decodeBase64(encoded)).toBe(original);
  });

  it('round-trips non-ASCII UTF-8 text (accents, CJK, emoji)', () => {
    const original = 'héllo 世界 🎉';
    const encoded = encodeBase64(original);
    expect(decodeBase64(encoded)).toBe(original);
  });

  it('produces the expected Base64 for a known ASCII string', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=');
  });

  it('throws a descriptive error on invalid Base64 input', () => {
    expect(() => decodeBase64('not valid base64!!!')).toThrow('Invalid Base64 input');
  });
});

describe('hashHex', () => {
  it('computes SHA-1 for known test vectors', async () => {
    expect(await hashHex('SHA-1', '')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(await hashHex('SHA-1', 'abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  it('computes SHA-256 for known test vectors', async () => {
    expect(await hashHex('SHA-256', '')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    expect(await hashHex('SHA-256', 'abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('computes SHA-384 for a known test vector', async () => {
    expect(await hashHex('SHA-384', 'abc')).toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7'
    );
  });

  it('computes SHA-512 for a known test vector', async () => {
    expect(await hashHex('SHA-512', 'abc')).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    );
  });

  it('returns lowercase hex of the correct length per algorithm', async () => {
    expect(await hashHex('SHA-1', 'x')).toMatch(/^[0-9a-f]{40}$/);
    expect(await hashHex('SHA-256', 'x')).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashHex('SHA-384', 'x')).toMatch(/^[0-9a-f]{96}$/);
    expect(await hashHex('SHA-512', 'x')).toMatch(/^[0-9a-f]{128}$/);
  });
});
