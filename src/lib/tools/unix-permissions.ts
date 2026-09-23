// Pure Unix permission math — octal <-> symbolic conversion and human-readable descriptions.
// No DOM, no localStorage; the caller (unix-permissions.astro) owns reading inputs/persisting
// state and just passes plain strings in, same separation as sre-calculator.ts.

interface ParsedOctal {
  special: number; // 0-7 (setuid=4, setgid=2, sticky=1)
  owner: number; // 0-7
  group: number; // 0-7
  other: number; // 0-7
}

function parseOctalString(octal: string): ParsedOctal {
  if (!/^[0-7]{3,4}$/.test(octal)) {
    throw new Error(`Invalid octal permissions: expected 3 or 4 octal digits (0-7), got "${octal}"`);
  }

  const digits = octal.length === 4 ? octal.split('').map(Number) : [0, ...octal.split('').map(Number)];
  const [special, owner, group, other] = digits;

  return { special, owner, group, other };
}

function triplet(value: number, chars: [string, string, string]): string {
  const [r, w, x] = chars;
  return `${value & 4 ? r : '-'}${value & 2 ? w : '-'}${value & 1 ? x : '-'}`;
}

// Converts a 3-digit (e.g. "755") or 4-digit (e.g. "4755") octal permission string into its
// 9-character symbolic form (e.g. "rwxr-xr-x"). The optional leading digit encodes setuid (4),
// setgid (2), and sticky (1) bits, which overlay the owner/group/other execute position.
export function octalToSymbolic(octal: string): string {
  const { special, owner, group, other } = parseOctalString(octal);

  const setuid = (special & 4) !== 0;
  const setgid = (special & 2) !== 0;
  const sticky = (special & 1) !== 0;

  let ownerStr = triplet(owner, ['r', 'w', 'x']);
  let groupStr = triplet(group, ['r', 'w', 'x']);
  let otherStr = triplet(other, ['r', 'w', 'x']);

  if (setuid) {
    const ownerExec = (owner & 1) !== 0;
    ownerStr = ownerStr.slice(0, 2) + (ownerExec ? 's' : 'S');
  }
  if (setgid) {
    const groupExec = (group & 1) !== 0;
    groupStr = groupStr.slice(0, 2) + (groupExec ? 's' : 'S');
  }
  if (sticky) {
    const otherExec = (other & 1) !== 0;
    otherStr = otherStr.slice(0, 2) + (otherExec ? 't' : 'T');
  }

  return `${ownerStr}${groupStr}${otherStr}`;
}

const TRIPLET_RE_OWNER = /^[r-][w-][xsS-]$/;
const TRIPLET_RE_GROUP = /^[r-][w-][xsS-]$/;
const TRIPLET_RE_OTHER = /^[r-][w-][xtT-]$/;

function parseTriplet(chars: string, execFlag: 's' | 't', label: string): { value: number; specialBit: number } {
  const readFlag = chars[0] === 'r';
  const writeFlag = chars[1] === 'w';
  const execChar = chars[2];

  let execBit = 0;
  let specialBit = 0;

  const lower = execFlag;
  const upper = execFlag === 's' ? 'S' : 'T';

  if (execChar === 'x') {
    execBit = 1;
  } else if (execChar === lower) {
    execBit = 1;
    specialBit = 1;
  } else if (execChar === upper) {
    execBit = 0;
    specialBit = 1;
  } else if (execChar === '-') {
    execBit = 0;
  } else {
    throw new Error(`Invalid symbolic permissions: unexpected character "${execChar}" in ${label} execute position`);
  }

  const value = (readFlag ? 4 : 0) + (writeFlag ? 2 : 0) + execBit;
  return { value, specialBit };
}

// Inverse of octalToSymbolic: converts a 9-character symbolic permission string (e.g.
// "rwxr-xr-x", "rwsr-xr-x") back into a 3 or 4-digit octal string. The leading special-bits
// digit is included only when nonzero.
export function symbolicToOctal(symbolic: string): string {
  if (symbolic.length !== 9) {
    throw new Error(`Invalid symbolic permissions: expected exactly 9 characters, got ${symbolic.length} ("${symbolic}")`);
  }

  const ownerChars = symbolic.slice(0, 3);
  const groupChars = symbolic.slice(3, 6);
  const otherChars = symbolic.slice(6, 9);

  if (!TRIPLET_RE_OWNER.test(ownerChars)) {
    throw new Error(`Invalid symbolic permissions: owner triplet "${ownerChars}" must match [r-][w-][xsS-]`);
  }
  if (!TRIPLET_RE_GROUP.test(groupChars)) {
    throw new Error(`Invalid symbolic permissions: group triplet "${groupChars}" must match [r-][w-][xsS-]`);
  }
  if (!TRIPLET_RE_OTHER.test(otherChars)) {
    throw new Error(`Invalid symbolic permissions: other triplet "${otherChars}" must match [r-][w-][xtT-]`);
  }

  const owner = parseTriplet(ownerChars, 's', 'owner');
  const group = parseTriplet(groupChars, 's', 'group');
  const other = parseTriplet(otherChars, 't', 'other');

  const special = owner.specialBit * 4 + group.specialBit * 2 + other.specialBit * 1;

  const base = `${owner.value}${group.value}${other.value}`;
  return special === 0 ? base : `${special}${base}`;
}

function describeClass(label: string, value: number): string {
  const perms: string[] = [];
  if (value & 4) perms.push('read');
  if (value & 2) perms.push('write');
  if (value & 1) perms.push('execute');

  if (perms.length === 0) return `${label}: no permissions`;
  if (perms.length === 1) return `${label}: ${perms[0]} only`;
  return `${label}: ${perms.join(', ')}`;
}

// Returns human-readable lines, one per class (owner/group/other), describing what a given
// octal permission string grants. Reuses parseOctalString (via octalToSymbolic's validation
// path) rather than re-implementing octal-digit parsing.
export function describePermissions(octal: string): string[] {
  const { owner, group, other } = parseOctalString(octal);

  return [describeClass('Owner', owner), describeClass('Group', group), describeClass('Other', other)];
}
