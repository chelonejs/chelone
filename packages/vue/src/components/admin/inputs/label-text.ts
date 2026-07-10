/**
 * `humanizeSource` — the minimal label fallback the V1 inputs/columns use when
 * no explicit `label` is given: turn a field source (`author_id`, `is_published`,
 * `author.name`) into a Title-Cased human string. A trimmed stand-in for
 * `@chelone/react`'s `<FieldLabelText>` + i18n `useTranslateLabel` chain (the
 * full resource-scoped translation lookup is a later wave); it keeps the vertical
 * readable without pulling the whole label i18n surface.
 */

/** `"author_id"` → `"Author"`, `"is_published"` → `"Is Published"`, `"a.b"` → `"B"`. */
export function humanizeSource(source: string): string {
  const last = source.split(".").pop() ?? source;
  return last
    .replace(/_id$/, "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
