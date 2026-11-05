import { describe, expect, it } from "vitest";
import { createVNode, Fragment, h, Text } from "vue";
import { childVNodes } from "./vnode-children";

describe("childVNodes", () => {
  it("childVNodes returns the vnodes of an array child", () => {
    const a = h("a");
    const b = h("b");

    expect(childVNodes(h(Fragment, [a, b]))).toEqual([a, b]);
  });

  it("childVNodes flattens nested arrays", () => {
    const a = h("a");
    const b = h("b");
    const c = h("c");
    // `createVNode` keeps the nested array as given; `h` would not.
    const node = createVNode(Fragment, null, [a, [b, [c]]]);

    expect(childVNodes(node)).toEqual([a, b, c]);
  });

  it("childVNodes skips strings and returns [] for a text child", () => {
    const a = h("a");
    const mixed = createVNode(Fragment, null, ["text", a, ["more"]]);

    expect(childVNodes(mixed)).toEqual([a]);
    expect(childVNodes(h("p", "hello"))).toEqual([]);
    expect(childVNodes(createVNode(Text, null, "hi"))).toEqual([]);
  });
});
