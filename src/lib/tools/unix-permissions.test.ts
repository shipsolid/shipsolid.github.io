import { describe, expect, it } from 'vitest';
import { describePermissions, octalToSymbolic, symbolicToOctal } from './unix-permissions';

describe('octalToSymbolic', () => {
  it('converts a plain 3-digit octal', () => {
    expect(octalToSymbolic('755')).toBe('rwxr-xr-x');
    expect(octalToSymbolic('644')).toBe('rw-r--r--');
    expect(octalToSymbolic('777')).toBe('rwxrwxrwx');
    expect(octalToSymbolic('000')).toBe('---------');
  });

  it('handles a 4-digit octal with a zero special-bits digit', () => {
    expect(octalToSymbolic('0644')).toBe('rw-r--r--');
  });

  it('renders setuid as lowercase s when owner execute is set', () => {
    expect(octalToSymbolic('4755')).toBe('rwsr-xr-x');
  });

  it('renders setuid as uppercase S when owner execute is not set', () => {
    expect(octalToSymbolic('4655')).toBe('rwSr-xr-x');
  });

  it('renders setgid as lowercase s when group execute is set', () => {
    expect(octalToSymbolic('2755')).toBe('rwxr-sr-x');
  });

  it('renders setgid as uppercase S when group execute is not set', () => {
    expect(octalToSymbolic('2744')).toBe('rwxr-Sr--');
  });

  it('renders sticky bit as lowercase t when other execute is set', () => {
    expect(octalToSymbolic('1777')).toBe('rwxrwxrwt');
  });

  it('renders sticky bit as uppercase T when other execute is not set', () => {
    expect(octalToSymbolic('1774')).toBe('rwxrwxr-T');
  });

  it('throws for a string that is not 3-4 octal digits', () => {
    expect(() => octalToSymbolic('12')).toThrow();
    expect(() => octalToSymbolic('12345')).toThrow();
    expect(() => octalToSymbolic('789')).toThrow();
    expect(() => octalToSymbolic('abc')).toThrow();
  });
});

describe('symbolicToOctal', () => {
  it('converts a plain symbolic string with no special bits', () => {
    expect(symbolicToOctal('rwxr-xr-x')).toBe('755');
    expect(symbolicToOctal('rw-r--r--')).toBe('644');
    expect(symbolicToOctal('rwxrwxrwx')).toBe('777');
    expect(symbolicToOctal('---------')).toBe('000');
  });

  it('includes the leading special-bits digit only when nonzero', () => {
    expect(symbolicToOctal('rwsr-xr-x')).toBe('4755');
    expect(symbolicToOctal('rwxr-sr-x')).toBe('2755');
    expect(symbolicToOctal('rwxrwxrwt')).toBe('1777');
  });

  it('decodes uppercase S/T as the special bit without the execute bit', () => {
    expect(symbolicToOctal('rwSr-xr-x')).toBe('4655');
    expect(symbolicToOctal('rwxrwxr-T')).toBe('1774');
  });

  it('throws for a string that is not exactly 9 characters', () => {
    expect(() => symbolicToOctal('rwxr-xr-')).toThrow();
    expect(() => symbolicToOctal('rwxr-xr-xx')).toThrow();
  });

  it('throws for an invalid character in a triplet position', () => {
    expect(() => symbolicToOctal('rwzr-xr-x')).toThrow();
    expect(() => symbolicToOctal('rwxr-tr-x')).toThrow(); // 't' invalid outside "other" position
  });
});

describe('octalToSymbolic / symbolicToOctal round trip', () => {
  it.each(['644', '755', '4755', '2755', '1777', '777'])('round-trips %s exactly', (octal) => {
    expect(symbolicToOctal(octalToSymbolic(octal))).toBe(octal);
  });

  it('round-trips "0000" to the equivalent zero-special-digit form "000"', () => {
    // The leading special-bits digit is only emitted when nonzero, so a 4-digit input whose
    // special digit was already 0 comes back as the canonical 3-digit form — semantically
    // identical permissions, different string.
    expect(symbolicToOctal(octalToSymbolic('0000'))).toBe('000');
  });
});

describe('describePermissions', () => {
  it('describes a mixed owner/group/other permission set', () => {
    expect(describePermissions('754')).toEqual([
      'Owner: read, write, execute',
      'Group: read, execute',
      'Other: read only',
    ]);
  });

  it('describes no permissions for a class', () => {
    expect(describePermissions('700')).toEqual([
      'Owner: read, write, execute',
      'Group: no permissions',
      'Other: no permissions',
    ]);
  });

  it('describes full permissions for all classes', () => {
    expect(describePermissions('777')).toEqual([
      'Owner: read, write, execute',
      'Group: read, write, execute',
      'Other: read, write, execute',
    ]);
  });

  it('throws for an invalid octal string', () => {
    expect(() => describePermissions('99')).toThrow();
  });
});
