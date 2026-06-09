import { z } from 'zod';

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid phone number');

export const emailSchema = z.string().email('Enter a valid email address');

export const otpSchema = z.string().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Must be numeric');

export const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long');

export const authPhoneSchema = z.object({
  name: z.string().optional(),
  identifier: phoneSchema,
});

export const authEmailSchema = z.object({
  name: z.string().optional(),
  identifier: emailSchema,
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const adminSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[a-zA-Z]/, 'Password must contain a letter'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[a-zA-Z]/, 'Password must contain a letter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function getAuthSchema(isSignup, tab) {
  if (tab === 'phone') {
    return isSignup ? authPhoneSchema : authPhoneSchema.omit(['name']);
  }
  return isSignup ? authEmailSchema : authEmailSchema.omit(['name']);
}