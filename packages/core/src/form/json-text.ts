// Monaco numbers and strings both adapters share. Plain values: core imports nothing from Monaco.

/** Monaco's `MarkerSeverity.Error`. */
export const ERROR_SEVERITY = 8;

/**
 * How long after the last edit `settled` waits for Monaco's markers. Monaco
 * posts them about 500 ms after an edit.
 */
export const MARKERS_SETTLE_MS = 750;

// Monaco's JSON diagnostics adapter debounces validation by this long after an edit.
export const MONACO_DIAGNOSTICS_DELAY_MS = 500;

export const MONACO_MIN_HEIGHT = 120;

/** Every model path the Monaco add-on creates starts with this. */
export const MODEL_PREFIX = "inmemory://monaco-json-input/";

export type JsonShape = "string" | "object";

export function detectJsonShape(value: unknown): JsonShape | null {
  if (value === undefined) return null;
  return typeof value === "string" ? "string" : "object";
}

export function toJsonText(
  value: unknown,
  shape: JsonShape,
  indent = 2,
): string {
  if (shape === "string") return typeof value === "string" ? value : "";
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, indent) ?? "";
  } catch {
    return "";
  }
}

export function fromJsonText(
  text: string,
  shape: JsonShape,
  // type-escape: json: the parsed text, or the text itself for a string shape; only the field knows which
): { value: unknown; parseError: Error | null } {
  if (shape === "string") return { value: text, parseError: null };
  if (text.trim() === "") return { value: null, parseError: null };
  try {
    return { value: JSON.parse(text), parseError: null };
  } catch (error) {
    return {
      value: undefined,
      parseError: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Read-only display: unlike `toJsonText`, never returns empty text.
export function formatJsonValue(value: unknown, indent = 2): string {
  try {
    if (typeof value === "string") {
      const parsed = parseOrKeep(value);
      if (!parsed.ok) return value;
      return JSON.stringify(parsed.value, null, indent) ?? value;
    }
    return JSON.stringify(value, null, indent) ?? String(value);
  } catch {
    return String(value);
  }
}

// type-escape: json: `JSON.parse`'s result, or the text kept when it does not parse
function parseOrKeep(text: string): { value: unknown; ok: boolean } {
  try {
    return { value: JSON.parse(text), ok: true };
  } catch {
    return { value: text, ok: false };
  }
}
