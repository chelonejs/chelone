import type { Identifier, ResourceRecord } from "@chelone/core";
import { quoteValue } from "./filters";

type Row = Record<string, unknown>;

export function getPrimaryKey(
  resource: string,
  primaryKeys:
    | Readonly<Record<string, readonly string[] | undefined>>
    | undefined,
): readonly string[] {
  return primaryKeys && Object.hasOwn(primaryKeys, resource)
    ? (primaryKeys[resource] ?? ["id"])
    : ["id"];
}

const isSingle = (primaryKey: readonly string[]) => primaryKey.length === 1;

/** A compound key id is the JSON array of the key columns' values. */
export function encodeId(
  record: Row,
  primaryKey: readonly string[],
): Identifier {
  const [only] = primaryKey;
  if (isSingle(primaryKey) && only !== undefined) {
    return record[only] as Identifier;
  }
  return JSON.stringify(primaryKey.map((column) => record[column]));
}

export function decodeId(id: Identifier, primaryKey: readonly string[]): Row {
  const [only] = primaryKey;
  if (isSingle(primaryKey) && only !== undefined) return { [only]: id };

  let values: unknown;
  try {
    values = JSON.parse(String(id));
  } catch {
    values = undefined;
  }
  if (!Array.isArray(values) || values.length !== primaryKey.length) {
    throw new Error(
      `Cannot decode "${id}": expected a JSON array of ${primaryKey.length} values for the key (${primaryKey.join(", ")})`,
    );
  }
  return Object.fromEntries(
    primaryKey.map((column, index) => [column, values[index]]),
  );
}

/** Filter pairs matching any of `ids`, ready for `toQueryString`. */
export function idFilter(
  ids: readonly Identifier[],
  primaryKey: readonly string[],
): Array<[string, string]> {
  const [only] = primaryKey;
  if (isSingle(primaryKey) && only !== undefined) {
    const [first] = ids;
    const value =
      ids.length === 1 && first !== undefined
        ? `eq.${first}`
        : `in.(${ids.map((id) => quoteValue(String(id))).join(",")})`;
    return [[only, value]];
  }

  // `or=()` is a parse error: use a group that no row satisfies.
  if (ids.length === 0 && only !== undefined) {
    return [["and", `(${only}.is.null,${only}.not.is.null)`]];
  }

  const groups = ids.map((id) => {
    const row = decodeId(id, primaryKey);
    return primaryKey
      .map((column) => {
        const part = row[column];
        return part === null
          ? `${column}.is.null`
          : `${column}.eq.${quoteValue(String(part))}`;
      })
      .join(",");
  });
  return groups.length === 1
    ? [["and", `(${groups[0]})`]]
    : [["or", `(${groups.map((group) => `and(${group})`).join(",")})`]];
}

/** Adds the `id` Chelone needs to a record whose key is not just `id`. */
export function withVirtualId(
  record: Row,
  primaryKey: readonly string[],
): ResourceRecord & Row {
  return { ...record, id: encodeId(record, primaryKey) };
}

/** Drops the `id` that `withVirtualId` added, before a record goes back to the table. */
export function withoutVirtualId(
  record: Row,
  primaryKey: readonly string[],
): Row {
  if (primaryKey.includes("id")) {
    // The virtual id replaced a real `id` column; the encoding kept its value.
    try {
      const { id } = decodeId(record.id as Identifier, primaryKey);
      return { ...record, id };
    } catch {
      return record;
    }
  }
  const { id: _virtual, ...rest } = record;
  return rest;
}

export function removePrimaryKey(
  record: Row,
  primaryKey: readonly string[],
): Row {
  return Object.fromEntries(
    Object.entries(record).filter(([column]) => !primaryKey.includes(column)),
  );
}
