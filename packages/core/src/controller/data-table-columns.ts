export interface DataTableColumnInfo {
  id: string;
  source?: string;
  label?: string;
  defaultHidden?: boolean;
}

export function defaultDataTableStoreKey(resource: string): string {
  return `${resource}.datatable`;
}

export function dataTableColumnKeys(storeKey: string) {
  return {
    hidden: storeKey,
    order: `${storeKey}_columnOrder`,
    columns: `${storeKey}_columns`,
  };
}

export function getDataTableColumnId({
  source,
  label,
}: {
  source?: unknown;
  label?: unknown;
}): string | undefined {
  if (typeof source === "string" && source !== "") return source;
  if (typeof label === "string" && label !== "") return label;
  return undefined;
}

/** The distinct ids in display order: the stored order first, then the rest as declared. */
function resolveOrder(
  ids: readonly (string | undefined)[],
  order: readonly string[],
): string[] {
  const present = new Set<string>();
  for (const id of ids) if (id !== undefined) present.add(id);
  const resolved = new Set<string>();
  for (const id of order) if (present.has(id)) resolved.add(id);
  for (const id of present) resolved.add(id);
  return [...resolved];
}

export function arrangeColumns(
  ids: readonly (string | undefined)[],
  { hidden, order }: { hidden: readonly string[]; order: readonly string[] },
): number[] {
  const indexesById = new Map<string, number[]>();
  ids.forEach((id, index) => {
    if (id === undefined) return;
    const indexes = indexesById.get(id);
    if (indexes) indexes.push(index);
    else indexesById.set(id, [index]);
  });
  const sequence = resolveOrder(ids, order).flatMap(
    (id) => indexesById.get(id) ?? [],
  );
  let next = 0;
  const arranged = ids.map((id, index) =>
    id === undefined ? index : (sequence[next++] ?? index),
  );
  return arranged.filter((index) => {
    const id = ids[index];
    return id === undefined || !hidden.includes(id);
  });
}

export function toggleHiddenColumn(
  hidden: readonly string[],
  id: string,
): string[] {
  return hidden.includes(id)
    ? hidden.filter((entry) => entry !== id)
    : [...hidden, id];
}

export function moveColumn(
  order: readonly string[],
  ids: readonly (string | undefined)[],
  id: string,
  direction: -1 | 1,
): string[] {
  const resolved = resolveOrder(ids, order);
  const from = resolved.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= resolved.length) return resolved;
  resolved.splice(to, 0, ...resolved.splice(from, 1));
  return resolved;
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function columnLabelMatches(label: string, query: string): boolean {
  if (query === "") return true;
  return fold(label).includes(fold(query));
}
