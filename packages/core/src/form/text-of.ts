/** A form value as text: `""` for `null` and `undefined`, the string itself, `String(value)` for anything else. */
// type-escape: context: reads any form value, whatever the field stored, which no record type pins.
export function textOf(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}
