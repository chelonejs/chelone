/**
 * Vanilla (context-free) source scoping for composed inputs — iterator rows,
 * grouped inputs, translatable fields. The React layer (T4) wraps these in a
 * SourceContext provider; the logic lives here so any framework adapter gets
 * identical path/label composition.
 *
 * Paths follow form-core's OWN syntax: array indices use brackets
 * (`items[0].sku`), object members use dots. Labels are translation-key
 * fragments and NEVER contain indices (`items.sku`), so one catalog entry
 * covers every row.
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

/** The identity scope — what a top-level form provides. */
export const rootSourceScope: SourceScope = {
  getSource: (source) => source,
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
  return {
    getSource: (source) => parent.getSource(composeSource(arraySource, source)),
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
