/**
 * The block drag handle, mounted in `<BlockEditorInput>` under the form
 * providers. A drag is driven with pointer events; jsdom has no `PointerEvent`
 * or layout, so the test stubs those and dnd-kit runs unmocked. Every top-level
 * block is 80px tall and 100px below the one before it.
 */
import { isBlockDoc } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import {
  StubIntersectionObserver,
  StubPointerEvent,
  stubAnimations,
} from "@chelone/test-utils/drag-dom";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import {
  doc,
  mountBlockEditor,
  mountUnderAdmin,
  paragraph,
  stubLayout,
  unmountAll,
} from "./__fixtures__/block-editor-harness";
import BlockDocField from "./block-doc-field.vue";

const BLOCK_STRIDE = 100;
const BLOCK_HEIGHT = 80;
// Each gap runs from the middle of the block before it to the middle of the one after, so the gap after the third of three blocks starts at 240.
const LAST_GAP_TOP = 2 * BLOCK_STRIDE + BLOCK_HEIGHT / 2;
const LAST_GAP_POINT = LAST_GAP_TOP + 20;

const make = (x: number, y: number, width: number, height: number) =>
  new DOMRect(x, y, width, height);

/** Where a layout change moves the blocks: the gap between one block's top and the next. */
let stride = BLOCK_STRIDE;

/** Reports a resize when the test says so. */
const resizeObservers: StubResizeObserver[] = [];
class StubResizeObserver {
  constructor(readonly callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Top-level blocks are laid out in a column; an absolutely placed element reports its own `top` and `height`. */
function rectOf(el: Element) {
  const parent = el.parentElement;
  if (parent?.classList.contains("ProseMirror")) {
    const at = Array.prototype.indexOf.call(parent.children, el);
    return make(0, at * stride, 400, BLOCK_HEIGHT);
  }
  if (el instanceof HTMLElement && el.style.top.endsWith("px")) {
    // dnd-kit moves the grip with a translate, which jsdom does not lay out.
    const [dx, dy] = el.style
      .getPropertyValue("--dnd-translate")
      .split(" ")
      .map((n) => Number.parseFloat(n) || 0);
    return make(
      dx ?? 0,
      Number.parseFloat(el.style.top) + (dy ?? 0),
      el.style.height === "" ? 24 : 400,
      el.style.height === "" ? 24 : Number.parseFloat(el.style.height),
    );
  }
  return make(0, 0, 0, 0);
}

beforeEach(() => {
  stubLayout();
  vi.stubGlobal("PointerEvent", StubPointerEvent);
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  // dnd-kit reads these off the document's window, which is not the global here.
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  Object.assign(window, {
    PointerEvent: StubPointerEvent,
    ResizeObserver: StubResizeObserver,
    IntersectionObserver: StubIntersectionObserver,
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  stride = BLOCK_STRIDE;
  resizeObservers.length = 0;
  stubAnimations();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return rectOf(this);
    },
  );
});

afterEach(() => {
  unmountAll();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const mount = (...content: ReturnType<typeof paragraph>[]) =>
  mountBlockEditor({}, { body: doc(...content) });

const texts = (mounted: Awaited<ReturnType<typeof mount>>) => {
  const body = mounted.onSubmit.mock.calls.at(-1)?.[0].body;
  return (isBlockDoc(body) ? (body.content ?? []) : []).map(
    (node) => node.content?.[0]?.text,
  );
};

const handle = () =>
  elementOf(
    document.querySelector("[data-slot=block-drag-handle]"),
    HTMLButtonElement,
  );
const handleCount = () =>
  document.querySelectorAll("[data-slot=block-drag-handle]").length;
const indicator = () =>
  document.querySelector("[data-slot=block-drop-indicator]");

const pointer = (
  target: Element | Document,
  type: "pointerdown" | "pointermove" | "pointerup",
  at: { x: number; y: number },
) => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: at.x,
      clientY: at.y,
      pointerType: "mouse",
      pointerId: 1,
      isPrimary: true,
      button: 0,
    }),
  );
};

/** Press the handle and move past the activation distance. */
async function pickUp() {
  const held = handle();
  const { x, y, width, height } = held.getBoundingClientRect();
  const from = { x: x + width / 2, y: y + height / 2 };
  pointer(held, "pointerdown", from);
  pointer(document, "pointermove", { x: from.x, y: from.y + 10 });
  await vi.waitFor(() =>
    expect(handle().hasAttribute("data-dragging")).toBe(true),
  );
}

/** Move the held block to `y`, and wait for the drop line in the gap that starts at `gapTop`. */
async function moveTo(y: number, gapTop: number) {
  pointer(document, "pointermove", { x: 200, y });
  await vi.waitFor(() =>
    expect(
      elementOf(indicator()?.parentElement ?? null, HTMLElement).style.top,
    ).toBe(`${gapTop}px`),
  );
}

describe("block drag handle", () => {
  it("shows beside the hovered block while editable, and not in BlockDocField", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"), paragraph("C"));
    expect(handle().getAttribute("aria-label")).toBe("Drag to move");
    expect(handle().style.top).toBe("0px");

    mounted
      .dom()
      .children[1]?.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    await vi.waitFor(() =>
      expect(handle().style.top).toBe(`${BLOCK_STRIDE}px`),
    );
    unmountAll();

    const readOnly = await mountBlockEditor(
      { readOnly: true },
      { body: doc(paragraph("A")) },
    );
    expect(handleCount()).toBe(0);
    readOnly.wrapper.unmount();

    // `h` checks a generic component at its bound, so the record is named here
    // instead of written inline, where its extra keys would be excess.
    const record = { id: 1, body: doc(paragraph("A")) };
    mountUnderAdmin(() => h(BlockDocField, { source: "body", record }));
    await vi.waitFor(() =>
      expect(document.querySelector('[role="textbox"]')).not.toBeNull(),
    );
    await flushPromises();
    expect(handleCount()).toBe(0);
  });

  it("dropping on a gap moves the block and writes the document", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"), paragraph("C"));
    await pickUp();
    // The gap after the last block.
    await moveTo(LAST_GAP_POINT, LAST_GAP_TOP);
    pointer(document, "pointerup", { x: 200, y: LAST_GAP_POINT });
    await vi.waitFor(() => expect(indicator()).toBeNull());

    await mounted.submit();
    expect(texts(mounted)).toEqual(["B", "C", "A"]);
    // The selection follows the block.
    expect(mounted.editor().state.selection.$from.index(0)).toBe(2);
  });

  it("one undo puts a dragged block back", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"), paragraph("C"));
    await pickUp();
    await moveTo(LAST_GAP_POINT, LAST_GAP_TOP);
    pointer(document, "pointerup", { x: 200, y: LAST_GAP_POINT });
    await vi.waitFor(() => expect(indicator()).toBeNull());

    mounted.editor().commands.undo();
    await mounted.submit();
    expect(texts(mounted)).toEqual(["A", "B", "C"]);
  });

  it("follows the hovered block when the layout changes without an edit", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"), paragraph("C"));
    mounted
      .dom()
      .children[2]?.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    await vi.waitFor(() =>
      expect(handle().style.top).toBe(`${2 * BLOCK_STRIDE}px`),
    );

    // The window narrows and the text above wraps onto more lines.
    stride = 150;
    for (const observer of resizeObservers) observer.callback([], observer);
    await vi.waitFor(() => expect(handle().style.top).toBe("300px"));
  });

  it("returns to the selected block when the pointer leaves the editor", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"), paragraph("C"));
    mounted
      .dom()
      .children[2]?.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    await vi.waitFor(() =>
      expect(handle().style.top).toBe(`${2 * BLOCK_STRIDE}px`),
    );

    document
      .querySelector("[data-slot=block-drag-layer]")
      ?.parentElement?.dispatchEvent(new MouseEvent("mouseleave"));
    // The caret is in the first block.
    await vi.waitFor(() => expect(handle().style.top).toBe("0px"));
  });

  it("Escape cancels a drag with no change", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"), paragraph("C"));
    await pickUp();
    await moveTo(LAST_GAP_POINT, LAST_GAP_TOP);
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      }),
    );
    await vi.waitFor(() => expect(indicator()).toBeNull());
    pointer(document, "pointerup", { x: 200, y: LAST_GAP_POINT });

    await mounted.submit();
    expect(texts(mounted)).toEqual(["A", "B", "C"]);
    expect(mounted.editor().state.doc.child(0).textContent).toBe("A");
  });

  it("a drop outside every gap changes nothing", async () => {
    const mounted = await mount(paragraph("A"), paragraph("B"));
    await pickUp();
    await moveTo(120, 40);
    pointer(document, "pointermove", { x: 200, y: 900 });
    await vi.waitFor(() => expect(indicator()).toBeNull());
    pointer(document, "pointerup", { x: 200, y: 900 });

    await mounted.submit();
    expect(texts(mounted)).toEqual(["A", "B"]);
  });
});
