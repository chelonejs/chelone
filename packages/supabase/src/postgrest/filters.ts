/** The operators of the PostgREST docs, including the `not`, `all` and `any` modifiers. */
export type PostgrestOperator =
  | "eq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "neq"
  | "like"
  | "ilike"
  | "match"
  | "imatch"
  | "in"
  | "is"
  | "isdistinct"
  | "fts"
  | "plfts"
  | "phfts"
  | "wfts"
  | "cs"
  | "cd"
  | "ov"
  | "sl"
  | "sr"
  | "nxr"
  | "nxl"
  | "adj"
  | "not"
  | "or"
  | "and"
  | "all"
  | "any";

export interface BuildFiltersOptions {
  defaultListOp: PostgrestOperator;
}

type Term = {
  key: string;
  value: string;
  /** An `or` or `and` group, which nests as `or(...)` and not `or.(...)`. */
  group: boolean;
};

const RESERVED = /[,()"\\]/;

/** Double-quotes a value that holds a character PostgREST reads as syntax. */
export function quoteValue(value: string): string {
  return RESERVED.test(value) ? `"${value.replace(/["\\]/g, "\\$&")}"` : value;
}

export function buildFilters(
  filter: Record<string, unknown>,
  { defaultListOp }: BuildFiltersOptions,
): Array<[string, string]> {
  return terms(filter, defaultListOp, "", false).map((t) => [t.key, t.value]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function terms(
  filter: Record<string, unknown>,
  defaultOp: PostgrestOperator,
  path: string,
  quoted: boolean,
): Term[] {
  const out: Term[] = [];

  for (const [rawKey, value] of Object.entries(filter)) {
    if (value === undefined) continue;

    const at = rawKey.lastIndexOf("@");
    const name = at === -1 ? rawKey : rawKey.slice(0, at);
    const op =
      at === -1 ? defaultOp : (rawKey.slice(at + 1) as PostgrestOperator);
    const column = path === "" ? name : `${path}.${name}`;

    if ((name === "or" || name === "and") && isPlainObject(value)) {
      const inner = terms(value, defaultOp, "", true).map((t) =>
        t.group ? `${t.key}${t.value}` : `${t.key}.${t.value}`,
      );
      out.push({ key: name, value: `(${inner.join(",")})`, group: true });
    } else if (isPlainObject(value)) {
      out.push(...terms(value, defaultOp, column, quoted));
    } else if (op === "like" || op === "ilike") {
      for (const word of String(value).trim().split(/\s+/)) {
        if (word !== "") {
          out.push({
            key: column,
            value: `${op}.${format(`*${word}*`, quoted)}`,
            group: false,
          });
        }
      }
    } else {
      out.push({
        key: column,
        value: operand(op, value, quoted),
        group: false,
      });
    }
  }

  return out;
}

function operand(op: PostgrestOperator, value: unknown, quoted: boolean) {
  if (value === null) {
    if (op === "eq") return "is.null";
    if (op === "neq") return "not.is.null";
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => quoteValue(scalar(item))).join(",");
    if (op === "in") return `in.(${items})`;
    if (op === "cs" || op === "cd" || op === "ov") return `${op}.{${items}}`;
    return `${op}.${items}`;
  }
  return `${op}.${format(scalar(value), quoted)}`;
}

function format(value: string, quoted: boolean) {
  return quoted ? quoteValue(value) : value;
}

function scalar(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
