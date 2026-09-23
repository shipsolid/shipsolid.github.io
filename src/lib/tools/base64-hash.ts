// Base64 encode/decode (UTF-8 safe) and cryptographic hashing via Web Crypto. No DOM, no
// localStorage; base64-hash.astro owns reading inputs/persisting state and just passes plain
// strings in, same separation as ../sre-calculator.ts.
//
// btoa()/atob() only operate on Latin1 (byte) strings, so a plain `btoa(text)` throws
// InvalidCharacterError on anything outside that range (emoji, accented characters, CJK, etc).
// encodeBase64/decodeBase64 round-trip through TextEncoder/TextDecoder so arbitrary UTF-8 text
// survives intact.

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

export function decodeBase64(b64: string): string {
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    throw new Error('Invalid Base64 input');
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// MD5 is intentionally not offered: SubtleCrypto has no MD5 support, and hand-rolling a broken
// legacy hash algorithm isn't worth it for a quick utility tool.
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export async function hashHex(algorithm: HashAlgorithm, text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
