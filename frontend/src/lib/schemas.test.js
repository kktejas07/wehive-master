/**
 * Unit tests for src/lib/schemas.js
 * Pure Zod validation — no React, no network, no browser APIs needed.
 */
import {
  phoneSchema,
  emailSchema,
  otpSchema,
  nameSchema,
  authPhoneSchema,
  authEmailSchema,
  adminLoginSchema,
  adminSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  getAuthSchema,
} from './schemas';

// ─── phoneSchema ─────────────────────────────────────────────────────────────
describe('phoneSchema', () => {
  it('accepts E.164 with country code', () => {
    expect(phoneSchema.safeParse('+919876543210').success).toBe(true);
  });

  it('accepts 10-digit phone without plus', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(true);
  });

  it('accepts international number with plus', () => {
    expect(phoneSchema.safeParse('+12025551234').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(phoneSchema.safeParse('').success).toBe(false);
  });

  it('rejects phone shorter than 7 digits', () => {
    expect(phoneSchema.safeParse('12345').success).toBe(false);
  });

  it('rejects phone with letters', () => {
    expect(phoneSchema.safeParse('98765abc10').success).toBe(false);
  });

  it('rejects phone with spaces', () => {
    expect(phoneSchema.safeParse('+91 98765 43210').success).toBe(false);
  });

  it('error message is user-friendly', () => {
    const result = phoneSchema.safeParse('bad');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/phone/i);
  });
});

// ─── emailSchema ─────────────────────────────────────────────────────────────
describe('emailSchema', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('accepts email with plus-alias', () => {
    expect(emailSchema.safeParse('user+tag@domain.co.uk').success).toBe(true);
  });

  it('accepts subdomain email', () => {
    expect(emailSchema.safeParse('user@mail.example.org').success).toBe(true);
  });

  it('rejects email without @', () => {
    expect(emailSchema.safeParse('userexample.com').success).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(emailSchema.safeParse('user@').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
  });

  it('rejects plain string', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('error message mentions email', () => {
    const result = emailSchema.safeParse('bad');
    expect(result.error.issues[0].message).toMatch(/email/i);
  });
});

// ─── otpSchema ────────────────────────────────────────────────────────────────
describe('otpSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
  });

  it('rejects 5 digits', () => {
    expect(otpSchema.safeParse('12345').success).toBe(false);
  });

  it('rejects 7 digits', () => {
    expect(otpSchema.safeParse('1234567').success).toBe(false);
  });

  it('rejects alphanumeric', () => {
    expect(otpSchema.safeParse('12345a').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(otpSchema.safeParse('').success).toBe(false);
  });

  it('rejects OTP with spaces', () => {
    expect(otpSchema.safeParse('123 45').success).toBe(false);
  });

  it('error message mentions 6-digit', () => {
    const result = otpSchema.safeParse('12345');
    expect(result.error.issues[0].message).toMatch(/6/);
  });
});

// ─── nameSchema ──────────────────────────────────────────────────────────────
describe('nameSchema', () => {
  it('accepts normal name', () => {
    expect(nameSchema.safeParse('John Doe').success).toBe(true);
  });

  it('accepts 2-character name', () => {
    expect(nameSchema.safeParse('Jo').success).toBe(true);
  });

  it('rejects single character', () => {
    expect(nameSchema.safeParse('J').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(nameSchema.safeParse('').success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    expect(nameSchema.safeParse('A'.repeat(101)).success).toBe(false);
  });

  it('accepts exactly 100 characters', () => {
    expect(nameSchema.safeParse('A'.repeat(100)).success).toBe(true);
  });
});

// ─── adminLoginSchema ─────────────────────────────────────────────────────────
describe('adminLoginSchema', () => {
  it('accepts valid email and password', () => {
    const result = adminLoginSchema.safeParse({ email: 'admin@wehive.co.in', password: 'Secret1' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = adminLoginSchema.safeParse({ email: 'not-email', password: 'Secret1' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = adminLoginSchema.safeParse({ email: 'admin@test.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = adminLoginSchema.safeParse({ email: 'admin@test.com' });
    expect(result.success).toBe(false);
  });
});

// ─── adminSignupSchema ────────────────────────────────────────────────────────
describe('adminSignupSchema', () => {
  const valid = { name: 'Admin User', email: 'admin@wehive.co.in', password: 'Secure1pass' };

  it('accepts valid signup data', () => {
    expect(adminSignupSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = adminSignupSchema.safeParse({ ...valid, name: 'A' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('name');
  });

  it('rejects password shorter than 8 chars', () => {
    const result = adminSignupSchema.safeParse({ ...valid, password: 'Ab1' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('password');
  });

  it('rejects password without a number', () => {
    const result = adminSignupSchema.safeParse({ ...valid, password: 'NoNumberHere' });
    expect(result.success).toBe(false);
  });

  it('rejects password without a letter', () => {
    const result = adminSignupSchema.safeParse({ ...valid, password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = adminSignupSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────
describe('resetPasswordSchema', () => {
  it('accepts matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Secure1pass',
      confirmPassword: 'Secure1pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Secure1pass',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('confirmPassword');
    expect(result.error.issues[0].message).toMatch(/match/i);
  });

  it('rejects password without a number', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NoNumbers',
      confirmPassword: 'NoNumbers',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Ab1',
      confirmPassword: 'Ab1',
    });
    expect(result.success).toBe(false);
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────────
describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'not-email' }).success).toBe(false);
  });

  it('rejects missing email', () => {
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });
});

// ─── authPhoneSchema / authEmailSchema ───────────────────────────────────────
describe('authPhoneSchema', () => {
  it('accepts valid phone', () => {
    expect(authPhoneSchema.safeParse({ identifier: '+919876543210' }).success).toBe(true);
  });

  it('name is optional', () => {
    expect(authPhoneSchema.safeParse({ identifier: '+919876543210', name: undefined }).success).toBe(true);
  });

  it('rejects invalid phone', () => {
    expect(authPhoneSchema.safeParse({ identifier: 'not-phone' }).success).toBe(false);
  });
});

describe('authEmailSchema', () => {
  it('accepts valid email', () => {
    expect(authEmailSchema.safeParse({ identifier: 'user@example.com' }).success).toBe(true);
  });

  it('name is optional', () => {
    expect(authEmailSchema.safeParse({ identifier: 'user@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(authEmailSchema.safeParse({ identifier: 'invalid' }).success).toBe(false);
  });
});

// ─── getAuthSchema ────────────────────────────────────────────────────────────
describe('getAuthSchema', () => {
  it('returns phone schema when tab is phone', () => {
    const schema = getAuthSchema(false, 'phone');
    expect(schema.safeParse({ identifier: '+919876543210' }).success).toBe(true);
    expect(schema.safeParse({ identifier: 'not@email.com' }).success).toBe(false);
  });

  it('returns email schema when tab is not phone', () => {
    const schema = getAuthSchema(false, 'email');
    expect(schema.safeParse({ identifier: 'user@example.com' }).success).toBe(true);
    expect(schema.safeParse({ identifier: '9876543210' }).success).toBe(false);
  });

  it('signup mode includes name for email', () => {
    const schema = getAuthSchema(true, 'email');
    // name is optional in schema but field exists
    expect(schema.safeParse({ identifier: 'user@example.com', name: 'Alice' }).success).toBe(true);
  });
});
