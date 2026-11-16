import { describe, it, expect } from 'vitest';
import { IdentityService, RESERVED_USERNAMES_LOCAL } from '../IdentityService';

describe('IdentityService & Username Validation', () => {
  it('should accept valid standard usernames', () => {
    const validNames = ['alex', 'rohit_01', 'samira.chen', 'john_doe', 'user123', 'alpha.beta_09'];
    validNames.forEach((name) => {
      const res = IdentityService.validateFormat(name);
      expect(res.valid, `Expected "${name}" to be valid`).toBe(true);
    });
  });

  it('should reject usernames that are too short or too long', () => {
    expect(IdentityService.validateFormat('ab').valid).toBe(false);
    expect(IdentityService.validateFormat('a'.repeat(25)).valid).toBe(false);
  });

  it('should reject usernames starting with numbers or symbols', () => {
    expect(IdentityService.validateFormat('1alex').valid).toBe(false);
    expect(IdentityService.validateFormat('_alex').valid).toBe(false);
    expect(IdentityService.validateFormat('.alex').valid).toBe(false);
  });

  it('should reject usernames ending with a period or containing consecutive periods', () => {
    expect(IdentityService.validateFormat('alex.').valid).toBe(false);
    expect(IdentityService.validateFormat('alex..chen').valid).toBe(false);
  });

  it('should reject reserved system usernames', () => {
    const reserved = Array.from(RESERVED_USERNAMES_LOCAL);
    reserved.forEach((name) => {
      const res = IdentityService.validateFormat(name);
      expect(res.valid, `Expected reserved name "${name}" to be rejected`).toBe(false);
      expect(res.reason).toContain('reserved');
    });
  });

  it('should treat username availability case-insensitively', () => {
    // Both ALEX and alex must normalize to same representation
    const resUpper = IdentityService.validateFormat('ALEX');
    const resLower = IdentityService.validateFormat('alex');
    expect(resUpper.valid).toBe(true);
    expect(resLower.valid).toBe(true);

    const reservedUpper = IdentityService.validateFormat('ADMIN');
    expect(reservedUpper.valid).toBe(false);
    expect(reservedUpper.reason).toContain('reserved');
  });

  it('should confirm availability for unclaimed names in mock mode', async () => {
    const res = await IdentityService.checkAvailability('unique_user_99');
    expect(res.available).toBe(true);
    expect(res.normalized).toBe('unique_user_99');
  });
});
