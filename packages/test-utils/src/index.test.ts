import { describe, expect, it } from "vitest";
import {
  defined,
  elementOf,
  intersectionEntry,
  StubPointerEvent,
  stubAnimations,
} from "./index";

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

describe("intersectionEntry", () => {
  it("fills every entry field and varies only isIntersecting", () => {
    const inView = intersectionEntry(true);
    expect(inView.isIntersecting).toBe(true);
    expect(inView.intersectionRatio).toBe(1);
    expect(inView.rootBounds).toBeNull();
    expect(inView.target).toBeInstanceOf(HTMLElement);
    expect(inView.time).toBe(0);

    const outOfView = intersectionEntry(false);
    expect(outOfView.isIntersecting).toBe(false);
    expect(outOfView.intersectionRatio).toBe(0);
  });
});

describe("stubAnimations", () => {
  it("leaves no animation running and finishes the ones started at once", async () => {
    stubAnimations();

    expect(document.getAnimations()).toEqual([]);
    const animation = document.createElement("div").animate([], 100);
    expect(animation.playState).toBe("finished");
    await expect(animation.finished).resolves.toBe(animation);
  });
});

describe("StubPointerEvent", () => {
  it("carries the pointer fields and the mouse coordinates", () => {
    const event = new StubPointerEvent("pointerdown", {
      clientX: 3,
      clientY: 4,
      pointerType: "touch",
    });
    expect(event.pointerId).toBe(1);
    expect(event.pointerType).toBe("touch");
    expect(event.isPrimary).toBe(true);
    expect([event.clientX, event.clientY]).toEqual([3, 4]);
  });
});
