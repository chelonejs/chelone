import { describe, expect, it } from "vitest";
import {
  listCentre,
  listRowRect,
  StubPointerEvent,
  stubAnimations,
} from "./drag-dom";

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

describe("listRowRect", () => {
  it("stacks rows by document order, gives anything inside a row its slot, and adds a held row's translate", () => {
    document.body.innerHTML =
      '<ul><li class="row"><button>a</button></li><li class="row" style="--dnd-translate: 5px 7px">b</li></ul>';
    const layout = { rowSelector: ".row", rowHeight: 40 };
    const [first, second] = document.querySelectorAll(".row");
    const button = document.querySelector("button");
    if (!first || !second || !button) throw new Error("fixture");

    expect(listRowRect(button, layout)).toEqual(new DOMRect(0, 0, 300, 40));
    expect(listRowRect(second, layout)).toEqual(new DOMRect(5, 47, 300, 40));
    expect(listCentre(first, layout)).toEqual({ x: 150, y: 20 });
    expect(listRowRect(document.body, layout)).toEqual(
      new DOMRect(0, 0, 1024, 768),
    );
  });
});
