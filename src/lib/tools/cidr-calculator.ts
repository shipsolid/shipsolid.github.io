// Pure IPv4 CIDR math — parsing, validation, and network/broadcast/usable-range derivation.
// No DOM, no localStorage; the caller (cidr-calculator.astro) owns reading inputs/persisting
// state and just passes a raw CIDR string in, same separation as sre-calculator.ts.
//
// IPv4 only — IPv6 is explicitly out of scope for this tool.

export interface CidrResult {
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  firstUsable: string | null;
  lastUsable: string | null;
  totalHosts: number;
  usableHosts: number;
}

// Formats a 32-bit unsigned integer back to dotted-decimal notation.
export function intToIp(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

function parseIp(ipString: string): number {
  const octetStrings = ipString.split('.');
  if (octetStrings.length !== 4) {
    throw new Error(`Invalid CIDR: expected 4 dot-separated octets, got ${octetStrings.length} ("${ipString}")`);
  }

  const octets = octetStrings.map((part, index) => {
    if (!/^\d+$/.test(part)) {
      throw new Error(`Invalid CIDR: octet ${index} is not a valid number: "${part}"`);
    }
    const value = Number(part);
    if (value < 0 || value > 255) {
      throw new Error(`Invalid CIDR: octet ${index} out of range (0-255): ${value}`);
    }
    return value;
  });

  // Regular arithmetic (not bit-shifting) avoids sign issues with values >= 2^31.
  return octets.reduce((acc, o) => acc * 256 + o, 0);
}

export function calcCidr(cidrString: string): CidrResult {
  const trimmed = cidrString.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid CIDR: expected exactly one "/", got "${trimmed}"`);
  }

  const [ipPart, prefixPart] = parts;

  if (!/^\d+$/.test(prefixPart)) {
    throw new Error(`Invalid CIDR: prefix length must be an integer, got "${prefixPart}"`);
  }
  const prefixLength = Number(prefixPart);
  if (prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid CIDR: prefix length must be 0-32, got ${prefixLength}`);
  }

  const ipInt = parseIp(ipPart);

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  const wildcardMask = (~mask) >>> 0;

  const networkAddress = (ipInt & mask) >>> 0;
  const broadcastAddress = (networkAddress | wildcardMask) >>> 0;

  const totalHosts = 2 ** (32 - prefixLength);

  let usableHosts: number;
  let firstUsable: string | null;
  let lastUsable: string | null;

  if (prefixLength <= 30) {
    usableHosts = totalHosts - 2;
    firstUsable = intToIp(networkAddress + 1);
    lastUsable = intToIp(broadcastAddress - 1);
  } else if (prefixLength === 31) {
    usableHosts = 2;
    firstUsable = intToIp(networkAddress);
    lastUsable = intToIp(broadcastAddress);
  } else {
    // prefixLength === 32
    usableHosts = 1;
    firstUsable = intToIp(networkAddress);
    lastUsable = intToIp(networkAddress);
  }

  return {
    networkAddress: intToIp(networkAddress),
    broadcastAddress: intToIp(broadcastAddress),
    subnetMask: intToIp(mask),
    wildcardMask: intToIp(wildcardMask),
    firstUsable,
    lastUsable,
    totalHosts,
    usableHosts,
  };
}
