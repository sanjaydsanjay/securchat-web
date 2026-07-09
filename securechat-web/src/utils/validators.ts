import { z } from 'zod'
import { UNIQUE_ID_MIN, UNIQUE_ID_MAX } from '@/lib/constants'

export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(128)
export const displayNameSchema = z.string().min(1, 'Display name is required').max(50).trim()
export const bioSchema = z.string().max(200).optional()
export const uniqueIdSchema = z
  .number()
  .int()
  .min(UNIQUE_ID_MIN, `ID must be between ${UNIQUE_ID_MIN}-${UNIQUE_ID_MAX}`)
  .max(UNIQUE_ID_MAX, `ID must be between ${UNIQUE_ID_MIN}-${UNIQUE_ID_MAX}`)

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
})

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const profileSchema = z.object({
  display_name: displayNameSchema.optional(),
  bio: bioSchema,
  avatar_url: z.string().url().nullable().optional(),
})

export const messageContentSchema = z.string().min(1, 'Message cannot be empty').max(5000)

export const reportSchema = z.object({
  category: z.enum(['spam', 'harassment', 'threats', 'fake_account', 'child_safety', 'other']),
  description: z.string().max(500).optional(),
})

export const paymentSchema = z.object({
  plan: z.enum(['premium_basic', 'premium_standard', 'premium_pro']),
})
