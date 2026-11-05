import {
  isVNode,
  type VNode,
  type VNodeArrayChildren,
  type VNodeNormalizedChildren,
} from "vue";

/**
 * The vnodes among a vnode's children, flattening nested arrays. Strings
 * (a text child, or a raw string inside an array) are skipped.
 */
export function childVNodes(node: VNode): VNode[] {
  const out: VNode[] = [];
  const walk = (
    value: VNodeNormalizedChildren | VNodeArrayChildren[number],
  ) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
    } else if (isVNode(value)) {
      out.push(value);
    }
  };
  walk(node.children);
  return out;
}
