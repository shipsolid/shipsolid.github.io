import { describe, expect, it } from 'vitest';
import { isValidUuid, NIL_UUID, parseUuid } from './uuid-generator';

describe('isValidUuid', () => {
  it('accepts a well-formed UUID', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('accepts the nil UUID', () => {
    expect(isValidUuid(NIL_UUID)).toBe(true);
  });

  it('accepts uppercase hex digits', () => {
    expect(isValidUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('rejects garbage input', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
  });

  it('rejects missing hyphens', () => {
    expect(isValidUuid('123e4567e89b12d3a456426614174000')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417zzzz')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });
});

describe('parseUuid', () => {
  it('parses version 1 and an RFC 4122 variant (8)', () => {
    const result = parseUuid('123e4567-e89b-1d3d-8456-426614174000');
    expect(result.version).toBe(1);
    expect(result.variant).toBe('RFC 4122');
  });

  it('parses version 4 and an RFC 4122 variant (a)', () => {
    const result = parseUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(result.version).toBe(4);
    expect(result.variant).toBe('RFC 4122');
  });

  it('maps a variant nibble of 0 to NCS (reserved)', () => {
    const result = parseUuid('aaaaaaaa-bbbb-1ccc-0ddd-eeeeeeeeeeee');
    expect(result.variant).toBe('NCS (reserved)');
  });

  it('maps a variant nibble of c to Microsoft (reserved)', () => {
    const result = parseUuid('aaaaaaaa-bbbb-4ccc-cddd-eeeeeeeeeeee');
    expect(result.variant).toBe('Microsoft (reserved)');
  });

  it('maps a variant nibble of e to Future (reserved)', () => {
    const result = parseUuid('aaaaaaaa-bbbb-4ccc-eddd-eeeeeeeeeeee');
    expect(result.variant).toBe('Future (reserved)');
  });

  it('returns null version for a non-standard version nibble (0 or 9-f)', () => {
    expect(parseUuid('aaaaaaaa-bbbb-0ccc-8ddd-eeeeeeeeeeee').version).toBeNull();
    expect(parseUuid('aaaaaaaa-bbbb-fccc-8ddd-eeeeeeeeeeee').version).toBeNull();
  });

  it('throws a descriptive error on an invalid UUID', () => {
    expect(() => parseUuid('not-a-uuid')).toThrow('Invalid UUID');
  });
});
