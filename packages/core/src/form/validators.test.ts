import { describe, expect, it, vi } from "vitest";
import {
  choices,
  composeValidators,
  email,
  isEmpty,
  isRequired,
  maxLength,
  maxValue,
  minLength,
  minValue,
  number,
  regex,
  required,
} from "./validators";

describe("isEmpty", () => {
  it("treats undefined, null, '' and [] as empty", () => {
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty("")).toBe(true);
    expect(isEmpty([])).toBe(true);
  });

  it("keeps 0, false, ' ' and {} as NOT empty", () => {
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
    expect(isEmpty(" ")).toBe(false);
    expect(isEmpty({})).toBe(false);
  });
});

describe("composeValidators", () => {
  it("returns undefined when every validator passes", () => {
    const composed = composeValidators(
      () => undefined,
      () => null,
    );
    expect(composed("v", {}, undefined)).toBeUndefined();
  });

  it("short-circuits on the first error — later validators do not run", () => {
    const later = vi.fn(() => "late error");
    const composed = composeValidators(() => "first error", later);
    expect(composed("v", {}, undefined)).toBe("first error");
    expect(later).not.toHaveBeenCalled();
  });

  it("stays synchronous when every validator is synchronous", () => {
    const composed = composeValidators(
      () => undefined,
      () => "sync error",
    );
    const result = composed("v", {}, undefined);
    // NOT a promise — callers can branch synchronously (ra contract).
    expect(result).toBe("sync error");
  });

  it("accepts a single array argument (ra call style)", () => {
    const composed = composeValidators([() => undefined, () => "from array"]);
    expect(composed("v", {}, undefined)).toBe("from array");
  });

  it("filters out non-function members", () => {
    const composed = composeValidators(undefined, null, false, () => "kept");
    expect(composed("v", {}, undefined)).toBe("kept");
  });

  it("awaits async validators and continues past passing ones", async () => {
    const composed = composeValidators(
      async () => undefined,
      () => "after async",
    );
    const result = composed("v", {}, undefined);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe("after async");
  });

  it("an async error short-circuits the rest", async () => {
    const later = vi.fn(() => "late");
    const composed = composeValidators(async () => "async error", later);
    await expect(composed("v", {}, undefined)).resolves.toBe("async error");
    expect(later).not.toHaveBeenCalled();
  });

  it("passes (value, allValues, meta) through to every validator", () => {
    const spy = vi.fn(() => undefined);
    const composed = composeValidators(spy, spy);
    const values = { title: "t" };
    const meta = { source: "title" };
    composed("v", values, meta);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith("v", values, meta);
  });

  it("composes to a passing validator when given nothing", () => {
    expect(composeValidators()("v", {}, undefined)).toBeUndefined();
  });
});

describe("built-ins skip empty values (except required)", () => {
  const emptyValues = [undefined, null, "", []];
  const validators = {
    minLength: minLength(2),
    maxLength: maxLength(1),
    minValue: minValue(5),
    maxValue: maxValue(1),
    number: number(),
    regex: regex(/^\d+$/),
    email: email(),
    choices: choices(["a"]),
  };
  for (const [name, validator] of Object.entries(validators)) {
    it(`${name} passes every empty value`, () => {
      for (const value of emptyValues) {
        expect(validator(value, {}, undefined)).toBeUndefined();
      }
    });
  }
});

describe("required", () => {
  it("errors on empty values with the default i18n key", () => {
    const validator = required();
    for (const value of [undefined, null, "", []]) {
      expect(validator(value, {}, undefined)).toBe(
        "chelone.validation.required",
      );
    }
  });

  it("passes 0, false and non-empty values", () => {
    const validator = required();
    expect(validator(0, {}, undefined)).toBeUndefined();
    expect(validator(false, {}, undefined)).toBeUndefined();
    expect(validator("x", {}, undefined)).toBeUndefined();
  });

  it("tags itself with .isRequired for detection", () => {
    expect(required().isRequired).toBe(true);
  });

  it("supports a custom string message", () => {
    expect(required("app.required")("", {}, undefined)).toBe("app.required");
  });

  it("supports a message factory receiving {args, value, values}", () => {
    const factory = vi.fn(() => "built");
    const values = { a: 1 };
    expect(required(factory)("", values, undefined)).toBe("built");
    expect(factory).toHaveBeenCalledWith({
      args: undefined,
      value: "",
      values,
    });
  });
});

describe("minLength / maxLength", () => {
  it("minLength errors with a translatable payload carrying args", () => {
    expect(minLength(3)("ab", {}, undefined)).toEqual({
      message: "chelone.validation.minLength",
      args: { min: 3 },
    });
    expect(minLength(3)("abc", {}, undefined)).toBeUndefined();
  });

  it("counts array lengths too", () => {
    expect(minLength(2)(["a"], {}, undefined)).toEqual({
      message: "chelone.validation.minLength",
      args: { min: 2 },
    });
    expect(minLength(1)(["a"], {}, undefined)).toBeUndefined();
  });

  it("skips values without a length (ra parity)", () => {
    expect(minLength(3)(12, {}, undefined)).toBeUndefined();
    expect(maxLength(1)(12345, {}, undefined)).toBeUndefined();
  });

  it("maxLength errors above the limit", () => {
    expect(maxLength(2)("abc", {}, undefined)).toEqual({
      message: "chelone.validation.maxLength",
      args: { max: 2 },
    });
    expect(maxLength(3)("abc", {}, undefined)).toBeUndefined();
  });
});

describe("minValue / maxValue", () => {
  it("minValue errors below the minimum — 0 is validated, not skipped", () => {
    expect(minValue(5)(4, {}, undefined)).toEqual({
      message: "chelone.validation.minValue",
      args: { min: 5 },
    });
    expect(minValue(1)(0, {}, undefined)).toEqual({
      message: "chelone.validation.minValue",
      args: { min: 1 },
    });
    expect(minValue(5)(5, {}, undefined)).toBeUndefined();
  });

  it("maxValue errors above the maximum", () => {
    expect(maxValue(5)(6, {}, undefined)).toEqual({
      message: "chelone.validation.maxValue",
      args: { max: 5 },
    });
    expect(maxValue(5)(5, {}, undefined)).toBeUndefined();
  });
});

describe("number", () => {
  it("errors on non-numeric values", () => {
    expect(number()("abc", {}, undefined)).toBe("chelone.validation.number");
  });

  it("passes numeric strings and numbers", () => {
    expect(number()("12.5", {}, undefined)).toBeUndefined();
    expect(number()(12, {}, undefined)).toBeUndefined();
  });
});

describe("regex", () => {
  it("errors when a string does not match, with the pattern in args", () => {
    expect(regex(/^\d+$/)("abc", {}, undefined)).toEqual({
      message: "chelone.validation.regex",
      args: { pattern: "/^\\d+$/" },
    });
  });

  it("passes matching strings and skips non-strings (ra parity)", () => {
    expect(regex(/^\d+$/)("123", {}, undefined)).toBeUndefined();
    expect(regex(/^\d+$/)(123, {}, undefined)).toBeUndefined();
  });
});

describe("email", () => {
  it("errors on invalid emails with its own i18n key", () => {
    expect(email()("not-an-email", {}, undefined)).toMatchObject({
      message: "chelone.validation.email",
    });
  });

  it("passes valid emails", () => {
    expect(email()("a@b.co", {}, undefined)).toBeUndefined();
  });
});

describe("choices", () => {
  it("errors when the value is not in the list", () => {
    expect(choices(["m", "f"])("x", {}, undefined)).toEqual({
      message: "chelone.validation.oneOf",
      args: { options: "m, f" },
    });
  });

  it("passes listed values", () => {
    expect(choices(["m", "f"])("m", {}, undefined)).toBeUndefined();
  });
});

describe("isRequired detection (RAW validate prop)", () => {
  it("detects a tagged single validator", () => {
    expect(isRequired(required())).toBe(true);
  });

  it("detects a tagged member anywhere in an array", () => {
    expect(isRequired([minLength(2), required()])).toBe(true);
  });

  it("stays false for untagged validators, arrays and nullish", () => {
    expect(isRequired(minLength(2))).toBe(false);
    expect(isRequired([minLength(2), email()])).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });
});
