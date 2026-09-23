import { describe, expect, it } from 'vitest';
import { calcCidr, intToIp } from './cidr-calculator';

describe('intToIp', () => {
  it('formats a 32-bit unsigned integer as dotted-decimal', () => {
    expect(intToIp(0xc0a80100)).toBe('192.168.1.0');
    expect(intToIp(0)).toBe('0.0.0.0');
    expect(intToIp(0xffffffff)).toBe('255.255.255.255');
  });
});

describe('calcCidr', () => {
  it('computes a standard /24', () => {
    const result = calcCidr('192.168.1.0/24');
    expect(result.networkAddress).toBe('192.168.1.0');
    expect(result.broadcastAddress).toBe('192.168.1.255');
    expect(result.subnetMask).toBe('255.255.255.0');
    expect(result.wildcardMask).toBe('0.0.0.255');
    expect(result.firstUsable).toBe('192.168.1.1');
    expect(result.lastUsable).toBe('192.168.1.254');
    expect(result.totalHosts).toBe(256);
    expect(result.usableHosts).toBe(254);
  });

  it('computes a /30', () => {
    const result = calcCidr('10.0.0.0/30');
    expect(result.networkAddress).toBe('10.0.0.0');
    expect(result.broadcastAddress).toBe('10.0.0.3');
    expect(result.subnetMask).toBe('255.255.255.252');
    expect(result.firstUsable).toBe('10.0.0.1');
    expect(result.lastUsable).toBe('10.0.0.2');
    expect(result.totalHosts).toBe(4);
    expect(result.usableHosts).toBe(2);
  });

  it('computes a /31 (RFC 3021 point-to-point)', () => {
    const result = calcCidr('10.0.0.0/31');
    expect(result.networkAddress).toBe('10.0.0.0');
    expect(result.broadcastAddress).toBe('10.0.0.1');
    expect(result.firstUsable).toBe('10.0.0.0');
    expect(result.lastUsable).toBe('10.0.0.1');
    expect(result.totalHosts).toBe(2);
    expect(result.usableHosts).toBe(2);
  });

  it('computes a /32 (single host)', () => {
    const result = calcCidr('10.0.0.5/32');
    expect(result.networkAddress).toBe('10.0.0.5');
    expect(result.broadcastAddress).toBe('10.0.0.5');
    expect(result.firstUsable).toBe('10.0.0.5');
    expect(result.lastUsable).toBe('10.0.0.5');
    expect(result.totalHosts).toBe(1);
    expect(result.usableHosts).toBe(1);
  });

  it('computes a /0 (entire address space)', () => {
    const result = calcCidr('0.0.0.0/0');
    expect(result.networkAddress).toBe('0.0.0.0');
    expect(result.broadcastAddress).toBe('255.255.255.255');
    expect(result.subnetMask).toBe('0.0.0.0');
    expect(result.wildcardMask).toBe('255.255.255.255');
    expect(result.totalHosts).toBe(2 ** 32);
    expect(result.usableHosts).toBe(2 ** 32 - 2);
  });

  it('throws for an invalid prefix length', () => {
    expect(() => calcCidr('192.168.1.0/33')).toThrow(/prefix length must be 0-32, got 33/);
  });

  it('throws for an out-of-range octet', () => {
    expect(() => calcCidr('192.168.1.300/24')).toThrow(/octet 3 out of range \(0-255\): 300/);
  });

  it('throws for a malformed string with no slash', () => {
    expect(() => calcCidr('192.168.1.0')).toThrow(/expected exactly one/);
  });

  it('throws for a malformed string with the wrong octet count', () => {
    expect(() => calcCidr('192.168.1/24')).toThrow(/expected 4 dot-separated octets/);
  });
});
