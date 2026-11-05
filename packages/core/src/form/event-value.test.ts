import { describe, expect, it } from "vitest";
import { extractEventValue } from "./event-value";

describe("extractEventValue", () => {
  it("yields target.checked for a checkbox event", () => {
    const event = { target: { type: "checkbox", checked: true, value: "on" } };
    expect(extractEventValue(event)).toBe(true);
  });

  it("yields target.value for a text event", () => {
    const event = { target: { type: "text", value: "hello" } };
    expect(extractEventValue(event)).toBe("hello");
  });

  it("passes a raw value through untouched", () => {
    expect(extractEventValue("raw")).toBe("raw");
    expect(extractEventValue(3)).toBe(3);
    const picked = { id: 1 };
    expect(extractEventValue(picked)).toBe(picked);
  });

  it("passes null through", () => {
    expect(extractEventValue(null)).toBeNull();
  });

  it("passes an object with a non-object target through", () => {
    const event = { target: "not-an-element" };
    expect(extractEventValue(event)).toBe(event);
    const bare = { target: {} };
    expect(extractEventValue(bare)).toBe(bare);
  });
});
