/**
 * ISO-8601 duration parse/format helpers — the Vue port of `@chelone/react`'s
 * `inputs/duration-utils.ts`. `<DurationInput>` imports `parseIsoDuration` to
 * seed its per-unit boxes; the `compactDuration` / `relativeDuration` renderers
 * come along for the eventual `<DurationField>` (kept for parity with the twin).
 */

const ISO_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

export interface ParsedDuration {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * Parse an ISO-8601 duration string (e.g. `PT2H30M`, `P1DT4H`) into a
 * `ParsedDuration`. Returns `null` for unparseable input.
 */
export function parseIsoDuration(s: string): ParsedDuration | null {
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

/** Render a `ParsedDuration` in compact human-readable form, e.g. `2h 30m`. */
export function compactDuration(p: ParsedDuration): string {
  const parts: string[] = [];
  if (p.days) parts.push(`${p.days}d`);
  if (p.hours) parts.push(`${p.hours}h`);
  if (p.minutes) parts.push(`${p.minutes}m`);
  if (p.seconds) parts.push(`${p.seconds}s`);
  return parts.join(" ") || "0m";
}

/** Render a `ParsedDuration` in relative long-form, e.g. `2 hours 30 minutes`. */
export function relativeDuration(p: ParsedDuration): string {
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
