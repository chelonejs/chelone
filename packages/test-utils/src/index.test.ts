import { describe, expect, it } from "vitest";
import { defined, elementOf } from "./index";

describe("defined", () => {
  it("defined returns a value and keeps 0, the empty string and false", () => {
    expect(defined(0)).toBe(0);
    expect(defined("")).toBe("");
    expect(defined(false)).toBe(false);
    expect(defined("a")).toBe("a");
    expect(defined(document.body)).toBe(document.body);
  });

  it("defined throws on null and on undefined", () => {
    expect(() => defined<string>(null)).toThrow("Expected a value, got null");
    expect(() => defined<string>(undefined)).toThrow(
      "Expected a value, got undefined",
    );
  });
});

describe("elementOf", () => {
  it("elementOf returns the element when the type matches", () => {
    document.body.innerHTML = '<input id="field" value="hello" />';

    const input = elementOf(document.querySelector("#field"), HTMLInputElement);

    expect(input.value).toBe("hello");
  });

  it("elementOf throws on null and on the wrong element, naming the expected type", () => {
    document.body.innerHTML = '<div id="box"></div>';

    expect(() =>
      elementOf(document.querySelector("#missing"), HTMLInputElement),
    ).toThrow("Expected HTMLInputElement");
    expect(() =>
      elementOf(document.querySelector("#box"), HTMLInputElement),
    ).toThrow("Expected HTMLInputElement");
    expect(() => elementOf(null, HTMLDivElement)).toThrow(
      "Expected HTMLDivElement",
    );
  });
});
