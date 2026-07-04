import cronstrue from "cronstrue";

/**
 * Returns a human-readable description of a 5-field standard cron expression,
 * or `null` when the expression is invalid.
 *
 * Lives in a sibling `.ts` so both `<CronField>` and `<CronInput>` can import
 * without triggering the `react-refresh/only-export-components` lint rule.
 */
function describeCron(expr: string): string | null {
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
function looksLikeCron(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return false;
  return CRON_RE.test(trimmed);
}

export { describeCron, looksLikeCron };
