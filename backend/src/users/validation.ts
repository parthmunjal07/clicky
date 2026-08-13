import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  avatarUrl: z
    .string()
    .url('Avatar must be a valid URL')
    .max(255)
    .optional()
    .or(z.literal('')),
  settings: z.string().optional(),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
