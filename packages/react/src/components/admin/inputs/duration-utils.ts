const ISO_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

interface ParsedDuration {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * Parses an ISO-8601 duration string (e.g. `PT2H30M`, `P1DT4H`) into a
 * `ParsedDuration` object. Returns `null` for unparseable input.
 *
 * Lives in a sibling `.ts` file (not the field component) so it can be
 * imported by `<DurationInput>` without triggering the
 * `react-refresh/only-export-components` lint rule.
 */
function parseIsoDuration(s: string): ParsedDuration | null {
  const m = s.match(ISO_RE);
  if (!m) return null;
  const [, d, h, mn, sc] = m;
  const out: ParsedDuration = {};
  if (d) out.days = +d;
  if (h) out.hours = +h;
  if (mn) out.minutes = +mn;
  if (sc) out.seconds = +sc;
  return out;
}

/**
 * Renders a `ParsedDuration` in compact human-readable form, e.g. `2h 30m`.
 */
function compactDuration(p: ParsedDuration): string {
  const parts: string[] = [];
  if (p.days) parts.push(`${p.days}d`);
  if (p.hours) parts.push(`${p.hours}h`);
  if (p.minutes) parts.push(`${p.minutes}m`);
  if (p.seconds) parts.push(`${p.seconds}s`);
  return parts.join(" ") || "0m";
}

/**
 * Renders a `ParsedDuration` in relative long-form, e.g. `2 hours 30 minutes`.
 *
 * Clean-room reimplementation of date-fns's `formatDuration` (the only shape
 * `<DurationField displayFormat="relative">` needs), so chelone avoids a
 * date-fns dependency for a single formatter — consistent with the zero-lodash
 * / minimal-dep ethos of `useFieldValue`. Emits English unit words with the
 * usual singular/plural rule, space-joined in largest-to-smallest order.
 */
function relativeDuration(p: ParsedDuration): string {
  const units: [keyof ParsedDuration, string][] = [
    ["days", "day"],
    ["hours", "hour"],
    ["minutes", "minute"],
    ["seconds", "second"],
  ];
  const parts: string[] = [];
  for (const [key, word] of units) {
    const n = p[key];
    if (n) parts.push(`${n} ${word}${n === 1 ? "" : "s"}`);
  }
  return parts.join(" ") || "0 seconds";
}

export {
  compactDuration,
  type ParsedDuration,
  parseIsoDuration,
  relativeDuration,
};
