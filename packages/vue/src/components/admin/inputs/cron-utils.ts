/**
 * Cron helpers — the Vue-package twin of `@chelone/react`'s
 * `inputs/cron-utils.ts`. Ported VERBATIM (pure functions, no framework code):
 * `describeCron` turns a 5-field cron expression into a human sentence via
 * `cronstrue`; `looksLikeCron` is a quick structural pre-filter. Lives in a
 * sibling `.ts` so both a future `<CronField>` and `<CronInput>` can import it.
 */

import cronstrue from "cronstrue";

/**
 * Returns a human-readable description of a 5-field standard cron expression,
 * or `null` when the expression is invalid.
 */
export function describeCron(expr: string): string | null {
  try {
    return cronstrue.toString(expr, { use24HourTimeFormat: true });
  } catch {
    return null;
  }
}

const CRON_RE = /^[\d\s*/,\-?LW#]+$/;

/**
 * Quick structural check on a 5-field cron string. Doesn't validate semantics
 * (that's what `describeCron` is for) — only filters obvious junk before
 * passing to cronstrue.
 */
export function looksLikeCron(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return false;
  return CRON_RE.test(trimmed);
}
