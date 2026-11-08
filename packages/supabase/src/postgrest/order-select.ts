import type { LooseSortPayload } from "@chelone/core";

/** Where nulls go for `ASC` and `DESC`, as `<ASC placement><DESC placement>`. */
export type PostgrestSortOrder =
  | "AscendingNullsLastDescendingNullsFirst"
  | "AscendingNullsFirstDescendingNullsLast"
  | "AscendingNullsFirstDescendingNullsFirst"
  | "AscendingNullsLastDescendingNullsLast";

export interface PostgrestMeta {
  columns?: string | string[];
  embed?: string[];
  /** `true` moves nulls first for every sort column, a list for those columns only. */
  nullsfirst?: boolean | string[];
  /** `true` moves nulls last for every sort column, a list for those columns only. */
  nullslast?: boolean | string[];
}

export interface BuildOrderOptions {
  sortOrder?: PostgrestSortOrder;
  meta?: PostgrestMeta;
}

const PLACEMENT: Record<PostgrestSortOrder, [asc: string, desc: string]> = {
  AscendingNullsLastDescendingNullsFirst: ["nullslast", "nullsfirst"],
  AscendingNullsFirstDescendingNullsLast: ["nullsfirst", "nullslast"],
  AscendingNullsFirstDescendingNullsFirst: ["nullsfirst", "nullsfirst"],
  AscendingNullsLastDescendingNullsLast: ["nullslast", "nullslast"],
};

function applies(flag: boolean | string[] | undefined, field: string) {
  return Array.isArray(flag) ? flag.includes(field) : flag === true;
}

export function buildOrder(
  sort: LooseSortPayload | LooseSortPayload[] | undefined,
  primaryKey: readonly string[],
  {
    sortOrder = "AscendingNullsLastDescendingNullsFirst",
    meta,
  }: BuildOrderOptions = {},
): string | undefined {
  const sorts = sort === undefined ? [] : Array.isArray(sort) ? sort : [sort];
  const [ascNulls, descNulls] = PLACEMENT[sortOrder];
  const parts: string[] = [];

  for (const { field, order } of sorts) {
    const direction = order === "ASC" ? "asc" : "desc";
    const columns = field === "id" ? primaryKey : [field];
    for (const column of columns) {
      const nulls = applies(meta?.nullsfirst, column)
        ? "nullsfirst"
        : applies(meta?.nullslast, column)
          ? "nullslast"
          : order === "ASC"
            ? ascNulls
            : descNulls;
      parts.push(`${column}.${direction}.${nulls}`);
    }
  }

  return parts.length === 0 ? undefined : parts.join(",");
}

export function buildSelect(meta: PostgrestMeta | undefined): string {
  const columns = Array.isArray(meta?.columns)
    ? meta.columns.join(",")
    : meta?.columns;
  const embeds = (meta?.embed ?? []).map((name) => `${name}(*)`);
  return [columns || "*", ...embeds].join(",");
}
