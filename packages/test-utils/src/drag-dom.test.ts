import { describe, expect, it } from "vitest";
import { StubPointerEvent, stubAnimations } from "./drag-dom";

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
