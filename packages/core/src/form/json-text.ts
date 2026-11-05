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

function parseOrKeep(text: string): { value: unknown; ok: boolean } {
  try {
    return { value: JSON.parse(text), ok: true };
  } catch {
    return { value: text, ok: false };
  }
}
