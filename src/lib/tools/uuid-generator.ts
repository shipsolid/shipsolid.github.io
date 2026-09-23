// Pure UUID validation/parsing helpers. Generation itself (crypto.randomUUID()) is a native
// browser call with nothing to unit test, so it stays in uuid-generator.astro's page script —
// this module only covers the testable surface: format validation and version/variant parsing.

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export interface ParsedUuid {
  version: number | null;
  variant: string;
}

// version: the first hex digit of the 3rd group, as a number 1-8. 0 and 9-f aren't standard
// version digits, so those parse to null rather than a misleading number.
//
// variant: inspects the first hex digit of the 4th group — 8/9/a/b -> "RFC 4122" (the common
// case for v1/v4/etc UUIDs), 0-7 -> "NCS (reserved)", c/d -> "Microsoft (reserved)",
// e/f -> "Future (reserved)".
export function parseUuid(value: string): ParsedUuid {
  if (!isValidUuid(value)) {
    throw new Error(`Invalid UUID: "${value}"`);
  }

  const groups = value.split('-');
  const versionDigit = parseInt(groups[2][0], 16);
  const version = versionDigit >= 1 && versionDigit <= 8 ? versionDigit : null;

  const variantNibble = groups[3][0].toLowerCase();
  let variant: string;
  if ('89ab'.includes(variantNibble)) {
    variant = 'RFC 4122';
  } else if ('01234567'.includes(variantNibble)) {
    variant = 'NCS (reserved)';
  } else if (variantNibble === 'c' || variantNibble === 'd') {
    variant = 'Microsoft (reserved)';
  } else {
    variant = 'Future (reserved)';
  }

  return { version, variant };
}
