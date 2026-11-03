/**
 * Vanilla (context-free) source scoping for composed inputs — iterator rows,
 * grouped inputs, translatable fields. The React layer (T4) wraps these in a
 * SourceContext provider; the logic lives here so any framework adapter gets
 * identical path/label composition.
 *
 * Paths follow form-core's OWN syntax: array indices use brackets
 * (`items[0].sku`), object members use dots. A source written the other way
 * (`items.0.sku`) is normalized to it — see {@link normalizeSource}. Labels
 * are translation-key fragments and NEVER contain indices (`items.sku`), so
 * one catalog entry covers every row.
 */
export interface SourceScope {
  /** The final field path for a child source (`''` = the scope itself). */
  getSource(source: string): string;
  /** The label/translation-key fragment for a child source — index-free. */
  getLabel(source: string): string;
}

/**
 * Joins two path fragments: bracket fragments (`[0]`, `[0].sku`) concatenate
 * directly (form-core index syntax), everything else joins with a dot.
 */
export function composeSource(parent: string, child: string): string {
  if (!child) return parent;
  if (!parent) return child;
  return child.startsWith("[") ? `${parent}${child}` : `${parent}.${child}`;
}

/**
 * Rewrite a dot-spelled array index as form-core's bracket spelling:
 * `tags.0.label` -> `tags[0].label`. Without it an input written with a dot
 * index binds a field named `tags.0.label`, which no validator, error or
 * field group matches, while the same path read as data (a `DataTable.Col`)
 * works — form-core's `getBy`/`setBy` accept both spellings, so only the
 * FIELD NAME differs.
 *
 * Only a digits-only member that FOLLOWS another member is an index: a
 * leading numeral (`0.a`) is a field name, and bracket spellings, non-numeric
 * members and the empty string pass through untouched. Labels never go
 * through this — translation keys keep the spelling as written.
 */
export function normalizeSource(source: string): string {
  let out = "";
  /** Bracket depth: inside a group the spelling is already form-core's. */
  let depth = 0;
  /** True once a member has been emitted — a dot before the next one is a join. */
  let afterMember = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "[") depth++;
    if (char === "]") depth--;

    if (char === "." && depth === 0 && afterMember) {
      let end = i + 1;
      while (
        end < source.length &&
        source[end] !== "." &&
        source[end] !== "["
      ) {
        end++;
      }
      const member = source.slice(i + 1, end);
      if (/^\d+$/.test(member)) {
        out += `[${member}]`;
        i = end - 1; // the dot is gone; resume at the next boundary
        continue;
      }
    }

    out += char;
    if (char !== ".") afterMember = true;
  }

  return out;
}

/**
 * What a top-level form provides: the identity scope for everything but a
 * dot-spelled index, which it rewrites to form-core's bracket spelling.
 */
export const rootSourceScope: SourceScope = {
  getSource: (source) => normalizeSource(source),
  getLabel: (source) => source,
};

/**
 * The scope an array input provides to its iterator: sources nest under the
 * array's own (scoped) path, labels under its index-free label path.
 *
 * `getSource('')` resolves the array field itself — how an iterator finds
 * the path it pushes/removes on.
 */
export function createArraySourceScope(
  parent: SourceScope,
  arraySource: string,
): SourceScope {
  // Resolved once so a parent that decorates the path (a locale scope) does so
  // for the array only, not again for every row.
  const arrayPath = parent.getSource(arraySource);
  return {
    // Normalizing the JOIN, not just the child: a child of `0` composes to
    // `tags.0`, where the index only follows a member once the array is there.
    // Row and locale scopes need neither — they hand the whole path to a
    // parent that normalizes it.
    getSource: (source) => normalizeSource(composeSource(arrayPath, source)),
    getLabel: (source) => parent.getLabel(composeSource(arraySource, source)),
  };
}

/**
 * The scope an iterator row provides to its children: sources gain the row's
 * `[index]` fragment; labels pass through UNCHANGED so translation keys stay
 * index-free (`orders.date`, not `orders.0.date`).
 *
 * Scalar rows (`<ArrayInput source="tags">` with a sourceless child) call
 * `getSource('')` and bind the row itself (`tags[2]`).
 */
export function createRowSourceScope(
  parent: SourceScope,
  index: number,
): SourceScope {
  return {
    getSource: (source) =>
      parent.getSource(source ? `[${index}].${source}` : `[${index}]`),
    getLabel: (source) => parent.getLabel(source),
  };
}

/**
 * The scope a translatable group provides for one locale: each child source
 * gains the locale as a trailing member (`title` -> `title.fr`). Labels pass
 * through so every locale shares one translation key.
 *
 * A translatable group has no value of its own, so a sourceless child has
 * nothing to bind and throws.
 */
export function createLocaleSourceScope(
  parent: SourceScope,
  locale: string,
): SourceScope {
  const requireSource = (source: string): void => {
    if (!source) {
      throw new Error("Children of a translatable group must have a source");
    }
  };
  return {
    getSource: (source) => {
      requireSource(source);
      return parent.getSource(`${source}.${locale}`);
    },
    getLabel: (source) => {
      requireSource(source);
      return parent.getLabel(source);
    },
  };
}
