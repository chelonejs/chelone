/**
 * The value each input family edits, and one guard per family that reads it out
 * of form state.
 *
 * The guards are total — every family has a value for every input, so an input
 * never has to cast its own value. They convert, not validate: a value the
 * family cannot hold lands on that family's empty value.
 */

import { isSafeImageSrc } from "../rich-text/rich-text";

/**
 * A value read out of form state: whatever the data provider put there, until a
 * guard names the family an input edits.
 */
// type-escape: context: form state is record-free; narrowing it is a guard's whole job.
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

/**
 * The value a choice list stores for one choice: its `id` when it has one (ra's
 * `choices` carry `{id, name}` pairs), the choice itself otherwise.
 */
export function choiceIdOf<TChoice>(choice: TChoice): ChoiceValueOf<TChoice> {
  if (typeof choice === "object" && choice !== null && "id" in choice) {
    // TS cannot follow the runtime `in` check into the deferred conditional.
    // type-escape: context: `ChoiceValueOf` names the id of a choice that has one.
    return choice.id as ChoiceValueOf<TChoice>;
  }
  // type-escape: context: a choice with no id is its own value.
  return choice as ChoiceValueOf<TChoice>;
}

/**
 * The value a single-choice input holds, which is the value of one of its
 * choices. An empty field is the empty value the input was given, which no
 * choice equals, so it is only ever compared.
 */
export function toChoiceValue<TChoice>(
  value: FormValue,
): ChoiceValueOf<TChoice> {
  // Form state is record-free.
  // type-escape: context: a choice input stores the value of one of its choices.
  return value as ChoiceValueOf<TChoice>;
}

/**
 * The value a choice stores: what was read at its `optionValue` path, else its
 * {@link choiceIdOf id}.
 */
export function resolveChoiceValue<TChoice>(
  choice: TChoice,
  atOptionValue: FormValue,
): ChoiceValueOf<TChoice> {
  return atOptionValue !== undefined
    ? toChoiceValue<TChoice>(atOptionValue)
    : choiceIdOf(choice);
}

const NO_CHOICE_VALUES: readonly never[] = Object.freeze([]);

/**
 * The values a multi-choice input holds: the stored array, one value for a
 * stored scalar, and a shared empty list for a missing one (so a render that
 * finds nothing keeps the same reference). `''` is missing too: it is what the
 * default format makes of a nullish value.
 */
export function toChoiceValues<TChoice>(
  value: FormValue,
): readonly ChoiceValueOf<TChoice>[] {
  if (value == null || value === "") return NO_CHOICE_VALUES;
  // Form state is record-free.
  // type-escape: context: a multi-choice input stores an array of its choices' values.
  if (Array.isArray(value)) return value as readonly ChoiceValueOf<TChoice>[];
  return [toChoiceValue<TChoice>(value)];
}

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

/** A tri-state boolean input's value: `true` or `false` as stored, `null` for every other value (unset is not false). */
export function toNullableBooleanValue(value: FormValue): boolean | null {
  return typeof value === "boolean" ? value : null;
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

/** A picked `File`, which may carry the object URL its preview holds. */
export type FileWithPreview = File & { preview?: string };

/** What `<FileInput>` stores for a dropped file: the file with the preview URL and title a preview child reads. */
export type TransformedFile = {
  rawFile: FileWithPreview;
  src: string;
  title: string;
};

/** A file already on the record: the `{ src, title }` object a data provider stores. Other keys ride along. */
export type StoredFile = {
  src?: string;
  title?: string;
};

/** One file a `<FileInput>` holds: a stored file may also be just its URL. */
export type FileEntry = FileWithPreview | TransformedFile | StoredFile | string;

/** What a `<FileInput>` holds: one entry, a list of them with `multiple`, or nothing. */
export type FileSelection = FileEntry | FileEntry[] | null;

/** `File` is read through the global so the guards also run where there is none (Node). */
function isFile(value: FormValue): value is FileWithPreview {
  return typeof File !== "undefined" && value instanceof File;
}

function isFileEntry(value: FormValue): value is FileEntry {
  return (
    isFile(value) ||
    (typeof value === "string" && value !== "") ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  );
}

/** The preview record `<FileInput>` makes of a dropped file. */
export function isTransformedFile(value: FormValue): value is TransformedFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "rawFile" in value &&
    isFile(value.rawFile) &&
    "src" in value &&
    typeof value.src === "string" &&
    "title" in value &&
    typeof value.title === "string"
  );
}

/**
 * A file input's selection: the entry, the entries of a list (anything that is
 * not a file, a record or a URL string dropped), `null` for a cleared one.
 */
export function toFileSelection(value: FormValue): FileSelection {
  if (Array.isArray(value)) return value.filter(isFileEntry);
  return isFileEntry(value) ? value : null;
}

/** The entries of a file input's value, in order. */
export function toFileEntries(value: FormValue): FileEntry[] {
  const selection = toFileSelection(value);
  if (selection === null) return [];
  return Array.isArray(selection) ? selection : [selection];
}

/** A stable list key for a file entry: the dropped file's name, else the stored `src` or URL, else its place. */
export function fileEntryKey(entry: FileEntry, index: number): string | number {
  if (typeof entry === "string") return entry;
  if (isTransformedFile(entry)) return entry.rawFile.name;
  if (isFile(entry)) return index;
  return entry.src ?? index;
}

/**
 * What an image preview shows of a file entry: its URL and a title, or `null`
 * when it has no URL or one that is not safe to load. A raster data URL is safe,
 * since data providers store uploads that way. A stored URL string is titled by
 * its file name, and a data URL string has none.
 */
export function fileEntryImage(
  entry: FileEntry | undefined,
): { src: string; title?: string } | null {
  if (entry === undefined || isFile(entry)) return null;
  const src = typeof entry === "string" ? entry : entry.src;
  if (!src || !isSafeImageSrc(src, { allowDataImages: true })) return null;
  if (typeof entry !== "string") return { src, title: entry.title };
  if (src.startsWith("data:")) return { src };
  return { src, title: entry.split("/").pop() };
}

/** The object URL a file entry's preview holds, to revoke when it goes. */
export function fileEntryPreview(entry: FileEntry): string | undefined {
  if (typeof entry === "string") return undefined;
  if (isTransformedFile(entry)) return entry.rawFile.preview;
  return isFile(entry) ? entry.preview : undefined;
}

/** A currency input's value: the amount, `null` when cleared (minor-vs-major units stay with the input). */
export function toCurrencyValue(value: FormValue): number | null {
  return toNumberValue(value);
}

/** What a multi-currency `<CurrencyInput>` stores: the amount and its currency code, when it has one. */
export interface CurrencyComposite {
  amount: number;
  currency: string | undefined;
}

/**
 * A multi-currency input's value: the amount with its currency, `null` for
 * anything without a numeric amount (an absent value, or a bare number from
 * single-currency mode). A currency that is missing or not text reads as
 * `undefined`, so the saved amount survives it.
 */
export function toCurrencyComposite(
  value: FormValue,
): CurrencyComposite | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("amount" in value)) return null;
  const amount = toNumberValue(value.amount);
  if (amount === null) return null;
  const currency =
    "currency" in value && typeof value.currency === "string"
      ? value.currency
      : undefined;
  return { amount, currency };
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
