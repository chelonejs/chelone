import {
  Comment,
  cloneVNode,
  Fragment,
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

/**
 * `nodes` with the fragments `v-for` makes opened up and the comments `v-if`
 * leaves dropped, so each remaining node is one the author wrote.
 */
export function flattenVNodes(nodes: readonly VNode[]): VNode[] {
  return nodes.flatMap((node) => {
    if (node.type === Comment) return [];
    if (node.type === Fragment) return flattenVNodes(childVNodes(node));
    return [node];
  });
}

/**
 * The nodes at `shown`, in that order, each keyed by its column id. A node
 * keeps its component instance when its position changes: columns and inputs
 * read their props once, so a reused instance would show another one's data. A
 * key the author set is kept, and a repeated id gets a count after it.
 */
export function keyByColumnId(
  nodes: readonly VNode[],
  ids: readonly (string | undefined)[],
  shown: readonly number[],
): VNode[] {
  const taken = new Map<string, number>();
  return shown.flatMap((index) => {
    const node = nodes[index];
    if (node === undefined) return [];
    if (node.key != null) return [node];
    const id = ids[index];
    const base = id === undefined ? `index:${index}` : `id:${id}`;
    const count = taken.get(base) ?? 0;
    taken.set(base, count + 1);
    return [cloneVNode(node, { key: count === 0 ? base : `${base}:${count}` })];
  });
}
