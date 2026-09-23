// Pure regex-testing logic for the regex playground tool. No DOM — the page owns rendering
// (highlighting matches, escaping user input into innerHTML) and calls this with plain strings.
//
// Designed to be called on every keystroke as the user types a pattern, so it must never throw:
// an in-progress/invalid pattern or flag combo is expected input, not an exceptional one.

export interface RegexMatch {
  match: string;
  index: number;
  groups: Record<string, string | undefined> | null;
}

export interface RegexTestResult {
  isValid: boolean;
  error: string | null;
  matches: RegexMatch[];
}

export function testRegex(pattern: string, flags: string, text: string): RegexTestResult {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
      matches: [],
    };
  }

  try {
    const matches: RegexMatch[] = [];

    if (flags.includes('g')) {
      for (const m of text.matchAll(regex)) {
        matches.push({
          match: m[0],
          index: m.index ?? 0,
          groups: m.groups ? { ...m.groups } : null,
        });
      }
    } else {
      // Without a `g` flag, real regex semantics only ever find the first match — match()
      // (rather than matchAll, which requires `g`) mirrors that faithfully.
      const m = text.match(regex);
      if (m) {
        matches.push({
          match: m[0],
          index: m.index ?? 0,
          groups: m.groups ? { ...m.groups } : null,
        });
      }
    }

    return { isValid: true, error: null, matches };
  } catch (err) {
    // Defensive: scanning itself shouldn't throw once the RegExp constructed successfully, but
    // keep the "never throw" contract airtight for callers driving this off live keystrokes.
    return {
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
      matches: [],
    };
  }
}
