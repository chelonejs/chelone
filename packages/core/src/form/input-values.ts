/**
 * The value each input family edits, and one guard per family that reads it out
 * of form state.
 *
 * The guards are total — every family has a value for every input, so an input
 * never has to cast its own value. They convert, not validate: a value the
 * family cannot hold lands on that family's empty value.
 */

/**
 * A value read out of form state: whatever the data provider put there, until a
 * guard names the family an input edits.
 */
// type-escape: form state is record-free; narrowing it is a guard's whole job.
export type FormValue = unknown;

/** What a date input edits: the `YYYY-MM-DD`/ISO string, the epoch number, a live `Date`, or nothing. */
export type DateInputValue = string | number | Date | null;

/** What a file input holds: a picked `File`, the stored reference (a URL) of the file on the record, or nothing. */
export type FileInputValue = File | string | null;

/** The storage shape a `<WebhookEndpointInput>` edits. */
export interface WebhookValue {
  url: string;
  secret: string;
  eventTypes: string[];
  lastDelivery?: {
    status: "ok" | "failed" | "pending";
    at: string;
  };
}

/**
 * The value a choice list stores for one choice: ra's `choices` carry an `id`
 * and the form holds that id, while a plain list of scalars holds the scalar.
 */
export type ChoiceValueOf<TChoice> = TChoice extends { id: infer TId }
  ? TId
  : TChoice;

/** The text a text input edits: `''` for a nullish value so the input stays controlled. */
export function toTextValue(value: FormValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** The rows of a text-array input: every entry as text, `[]` for a non-array. */
export function toTextList(value: FormValue): string[] {
  return Array.isArray(value) ? value.map(toTextValue) : [];
}

/** A number input's value: `null` for a cleared or non-numeric one (`''` is cleared, `0` is not). */
export function toNumberValue(value: FormValue): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** A boolean input's value: only `false`, `0`, `''`, `"false"`, `"0"` and a nullish value read as false. */
export function toBooleanValue(value: FormValue): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return value !== "" && value !== "false" && value !== "0";
  }
  return Boolean(value);
}

/**
 * A date input's value, unconverted: the string/number/`Date` it can edit,
 * `null` for a cleared one. Formatting to the input's own shape stays with the
 * input (it is the family that knows whether it wants `YYYY-MM-DD` or a time).
 */
export function toDateInputValue(value: FormValue): DateInputValue {
  if (value == null || value === "") return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  ) {
    return value;
  }
  return null;
}

/**
 * A file input's value: a live `File`, the stored reference (a URL string) of
 * the file already on the record, `null` for a cleared one. `File` is checked
 * through the global so the guard also runs where there is none (Node).
 */
export function toFileInputValue(value: FormValue): FileInputValue {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof File !== "undefined" && value instanceof File) return value;
  return null;
}

/** A currency input's value: the amount, `null` when cleared (minor-vs-major units stay with the input). */
export function toCurrencyValue(value: FormValue): number | null {
  return toNumberValue(value);
}

/** The empty endpoint a webhook input starts from. */
const EMPTY_WEBHOOK_VALUE: WebhookValue = {
  url: "",
  secret: "",
  eventTypes: [],
};

/** The last-delivery line, read out of a record that may hold anything under it. */
function toWebhookDelivery(
  value: FormValue,
): WebhookValue["lastDelivery"] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (!("at" in value) || typeof value.at !== "string") return undefined;
  const status =
    "status" in value &&
    (value.status === "ok" ||
      value.status === "failed" ||
      value.status === "pending")
      ? value.status
      : "pending";
  return { status, at: value.at };
}

/**
 * A webhook input's value: the endpoint object, filled in from whatever the
 * record holds so every member the input edits is present.
 */
export function toWebhookValue(value: FormValue): WebhookValue {
  if (typeof value !== "object" || value === null) {
    return { ...EMPTY_WEBHOOK_VALUE };
  }
  const lastDelivery =
    "lastDelivery" in value ? toWebhookDelivery(value.lastDelivery) : undefined;
  return {
    url: "url" in value ? toTextValue(value.url) : "",
    secret: "secret" in value ? toTextValue(value.secret) : "",
    eventTypes: "eventTypes" in value ? toTextList(value.eventTypes) : [],
    ...(lastDelivery === undefined ? {} : { lastDelivery }),
  };
}
