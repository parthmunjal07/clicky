import { z } from 'zod';

// ─── Allowed Mode Values ────────────────────────────────────────────────────

const TIMER_MODE_VALUES = [60, 30, 10] as const;
const CLICKS_MODE_VALUES = [50, 25, 10] as const;

// ─── Schemas ────────────────────────────────────────────────────────────────

export const startGameSchema = z
  .object({
    mode_type: z.enum(['timer', 'clicks']),
    mode_value: z.number().int().positive(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.mode_type === 'timer') {
        return (TIMER_MODE_VALUES as readonly number[]).includes(data.mode_value);
      }
      return (CLICKS_MODE_VALUES as readonly number[]).includes(data.mode_value);
    },
    {
      message:
        'Invalid mode_value. Timer accepts 60, 30, 10 (seconds). Clicks accepts 50, 25, 10 (target count).',
      path: ['mode_value'],
    },
  );

export const clickSchema = z
  .object({
    seq_num: z.number().int().nonnegative().optional(),
  })
  .strict();

export const clickBatchSchema = z
  .object({
    count: z.number().int().min(1).max(100),
    seq_num: z.number().int().nonnegative(),
  })
  .strict();

// ─── Type Exports ───────────────────────────────────────────────────────────

export type StartGameInput = z.infer<typeof startGameSchema>;
export type ClickInput = z.infer<typeof clickSchema>;
export type ClickBatchInput = z.infer<typeof clickBatchSchema>;

// ─── Physics Validation ─────────────────────────────────────────────────────

export const MAX_CPS = 20;

/**
 * Validates the physics of a game session to prevent superhuman/bot submissions.
 * It checks the overall click rate across the entire duration of the session.
 */
export function validateGamePhysics(clicks: number, elapsedMs: number): void {
  // Add a small buffer for elapsedMs in case the batch arrives instantly
  const actualElapsed = Math.max(elapsedMs, 100);
  const cps = (clicks * 1000) / actualElapsed;

  if (cps > MAX_CPS) {
    throw new Error(
      `Cheat detected: Inhuman click rate of ${cps.toFixed(1)} CPS (max ${MAX_CPS}). Session discarded.`
    );
  }
}

