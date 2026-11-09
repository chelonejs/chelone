import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeFormError,
  readFormValidatorResult,
  toFormErrorMapValue,
} from "./form-errors";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("normalizeFormError", () => {
  it("passes strings through", () => {
    expect(normalizeFormError("Required")).toBe("Required");
  });

  it("preserves ra translatable payloads ({message, args})", () => {
    expect(
      normalizeFormError({
        message: "chelone.validation.minLength",
        args: { min: 5 },
      }),
    ).toEqual({ message: "chelone.validation.minLength", args: { min: 5 } });
  });

  it("collapses a bare {message} (StandardSchemaV1Issue shape) to its message", () => {
    expect(normalizeFormError({ message: "Too small", path: ["title"] })).toBe(
      "Too small",
    );
  });

  it("drops a non-object args and returns the message alone", () => {
    expect(normalizeFormError({ message: "x", args: 5 })).toBe("x");
  });

  it("keeps the string and number args when others are not message params", () => {
    expect(
      normalizeFormError({
        message: "chelone.validation.minLength",
        args: { min: 5, strict: true, extra: undefined },
      }),
    ).toEqual({ message: "chelone.validation.minLength", args: { min: 5 } });
  });

  it("uses an Error's message", () => {
    expect(normalizeFormError(new Error("boom"))).toBe("boom");
  });

  it("normalizes the first entry of an issue array", () => {
    expect(
      normalizeFormError([{ message: "first" }, { message: "second" }]),
    ).toBe("first");
  });

  it("returns undefined for no error: nullish, false, an empty string or an empty array", () => {
    expect(normalizeFormError(null)).toBeUndefined();
    expect(normalizeFormError(undefined)).toBeUndefined();
    expect(normalizeFormError(false)).toBeUndefined();
    expect(normalizeFormError("")).toBeUndefined();
    expect(normalizeFormError([])).toBeUndefined();
  });

  it("shows chelone.validation.invalid for an error it does not recognize", () => {
    expect(normalizeFormError(42)).toBe("chelone.validation.invalid");
    expect(normalizeFormError({ code: 1 })).toBe("chelone.validation.invalid");
    expect(normalizeFormError({ message: 123 })).toBe(
      "chelone.validation.invalid",
    );
  });

  it("is idempotent, so a read of a written error returns it unchanged", () => {
    const written = {
      message: "chelone.validation.minLength",
      args: { min: 5 },
    };
    expect(normalizeFormError(normalizeFormError(written))).toEqual(written);
  });
});

describe("toFormErrorMapValue", () => {
  it("splits root from the field paths and normalizes every entry", () => {
    expect(
      toFormErrorMapValue({
        root: "Server says no",
        title: ["Taken", "Too short"],
        "items[0].sku": { message: "chelone.validation.required" },
      }),
    ).toEqual({
      form: "Server says no",
      fields: { title: "Taken", "items[0].sku": "chelone.validation.required" },
    });
  });

  it("drops empty entries and returns undefined when nothing remains", () => {
    expect(
      toFormErrorMapValue({ title: undefined, views: [] }),
    ).toBeUndefined();
    expect(toFormErrorMapValue(null)).toBeUndefined();
    expect(toFormErrorMapValue(undefined)).toBeUndefined();
  });
});

describe("readFormValidatorResult", () => {
  it("reads form-core's {form, fields} shape into messages", () => {
    expect(
      readFormValidatorResult({
        form: "Bad form",
        fields: { title: [{ message: "Too short" }] },
      }),
    ).toEqual({ form: "Bad form", fields: { title: "Too short" } });
  });

  it("keeps a schema's path-record form slot as the generic invalid-form message", () => {
    const issues = { title: [{ message: "Too short", path: ["title"] }] };
    expect(readFormValidatorResult({ form: issues, fields: issues })).toEqual({
      form: "chelone.message.invalid_form",
      fields: { title: "Too short" },
    });
  });

  it("reads a bare value as the form-level error", () => {
    expect(readFormValidatorResult(new Error("Bad"))).toEqual({
      form: "Bad",
      fields: {},
    });
  });

  it("returns undefined for a passing result", () => {
    expect(readFormValidatorResult(undefined)).toBeUndefined();
    expect(
      readFormValidatorResult({ form: undefined, fields: {} }),
    ).toBeUndefined();
  });
});

describe("unrecognized errors on write", () => {
  it("are reported outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readFormValidatorResult({ fields: { title: 42 } })).toEqual({
      form: undefined,
      fields: { title: "chelone.validation.invalid" },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toContain(42);
  });

  it("are not reported in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readFormValidatorResult(42)).toEqual({
      form: "chelone.validation.invalid",
      fields: {},
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("are not reported by a read, which may run on every render", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    normalizeFormError(42);
    expect(warn).not.toHaveBeenCalled();
  });
});
