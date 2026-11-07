import { describe, expect, it } from "vitest";
import {
  hasProperty,
  isHeadersInit,
  isJsonObject,
  isPlainObject,
  isRecord,
  isThenable,
} from "./guards";

class Query {
  sql = "select 1";
}

/** `Object.create(null)`, whose library return type is `any`. */
function nullProtoObject(): object {
  return Object.create(null);
}

/** An object holding itself: walking it forever is the failure to avoid. */
function cyclicObject(): { self?: object } {
  const node: { self?: object } = {};
  node.self = node;
  return node;
}

describe("isRecord", () => {
  it("accepts {}, a null-prototype object, a Date, a Map and a class instance", () => {
    const accepted = [
      {},
      nullProtoObject(),
      new Date(),
      new Map([["a", 1]]),
      new Query(),
    ];
    for (const value of accepted) {
      expect(isRecord(value)).toBe(true);
    }
  });

  it("refuses an array, null, undefined, a string, a number and a function", () => {
    const refused = [[1], null, undefined, "a", 1, () => {}];
    for (const value of refused) {
      expect(isRecord(value)).toBe(false);
    }
  });
});

describe("isPlainObject", () => {
  it("accepts {} and a null-prototype object", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(nullProtoObject())).toBe(true);
  });

  it("refuses an array, a Date, a Map, a class instance, an Object.create({}) object, null, undefined and a function", () => {
    const refused = [
      [1],
      new Date(),
      new Map([["a", 1]]),
      new Query(),
      Object.create({ a: 1 }),
      null,
      undefined,
      () => {},
    ];
    for (const value of refused) {
      expect(isPlainObject(value)).toBe(false);
    }
  });
});

describe("isJsonObject", () => {
  it("accepts nested objects and arrays of strings, finite numbers, booleans and null", () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject(nullProtoObject())).toBe(true);
    expect(
      isJsonObject({
        text: "a",
        count: 1,
        ratio: -0.5,
        on: true,
        off: false,
        missing: null,
        list: ["a", 1, true, null],
        nested: { list: [{ deep: null }] },
      }),
    ).toBe(true);
  });

  it("refuses an object with a Date nested in it", () => {
    expect(isJsonObject({ when: new Date() })).toBe(false);
  });

  it("refuses an object with an undefined nested in it", () => {
    expect(isJsonObject({ missing: undefined })).toBe(false);
    expect(isJsonObject({ nested: { missing: undefined } })).toBe(false);
  });

  it("refuses an object with a function nested in it", () => {
    expect(isJsonObject({ run: () => {} })).toBe(false);
  });

  it("refuses NaN, Infinity, a bigint and a class instance at depth, and an array, null and a cyclic object at the top", () => {
    expect(isJsonObject({ n: Number.NaN })).toBe(false);
    expect(isJsonObject({ n: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isJsonObject({ n: 10n })).toBe(false);
    expect(isJsonObject({ query: new Query() })).toBe(false);
    expect(isJsonObject([1, 2])).toBe(false);
    expect(isJsonObject(null)).toBe(false);
    expect(isJsonObject(cyclicObject())).toBe(false);
  });
});

describe("hasProperty", () => {
  it("narrows an object with the key and refuses null, an array and a primitive", () => {
    // type-escape: the guard narrows a value the compiler sees only as `unknown`
    const held: unknown = { target: 1 };
    if (!hasProperty(held, "target")) throw new Error("expected the key");
    expect(held.target).toBe(1);

    expect(hasProperty({ a: 1 }, "b")).toBe(false);
    expect(hasProperty(new Query(), "sql")).toBe(true);
    const refused = [null, undefined, [1], "abc", 1, true];
    for (const value of refused) {
      expect(hasProperty(value, "length")).toBe(false);
    }
  });
});

describe("isThenable", () => {
  it("accepts a promise and a thenable and refuses a function and null", () => {
    expect(isThenable(Promise.resolve(1))).toBe(true);
    // biome-ignore lint/suspicious/noThenProperty: the thenable is the case under test
    expect(isThenable({ then: () => {} })).toBe(true);

    const refused = [
      () => {},
      null,
      undefined,
      {},
      // biome-ignore lint/suspicious/noThenProperty: a non-function `then` is the case under test
      { then: 1 },
      "then",
    ];
    for (const value of refused) {
      expect(isThenable(value)).toBe(false);
    }
  });
});

describe("isHeadersInit", () => {
  it("isHeadersInit takes Headers, pairs and records, and refuses anything else", () => {
    const accepted = [
      new Headers({ a: "b" }),
      new Headers(),
      [["a", "b"]],
      [],
      { a: "b" },
      nullProtoObject(),
    ];
    for (const value of accepted) {
      expect(isHeadersInit(value)).toBe(true);
    }

    const refused = [
      undefined,
      null,
      "a=b",
      1,
      // a list of strings, not of pairs
      ["a", "b"],
      [["a", 1]],
      [["a"]],
      [[["a", "b"]]],
      { a: 1 },
      { a: null },
      new Map([["a", "b"]]),
      new Date(),
      new Query(),
      () => {},
    ];
    for (const value of refused) {
      expect(isHeadersInit(value)).toBe(false);
    }
  });
});
