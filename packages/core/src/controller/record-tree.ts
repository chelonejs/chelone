/**
 * Pure rule for nesting a flat record list into a tree from a parent field.
 * No react, no vue: both TreeList adapters build the same tree from the same
 * records, and no record disappears when the data holds a parent cycle.
 */

import { getAtPath } from "../resource/get-at-path";
import type { Identifier } from "../resource/identifier";
import type { SourcePath } from "../resource/source-path";

export interface RecordTreeNode<R> {
  record: R;
  children: RecordTreeNode<R>[];
}

/**
 * Roots and siblings keep list order, so the data provider's sort decides
 * the order. A record is a root when its parent value is null, undefined or
 * `""`, names itself, or names no record in the list (its parent may be on
 * another page). A cycle keeps its first record in list order as a root, with
 * the rest beneath it. A later record that repeats an id is left out.
 */
export function buildRecordTree<R extends { id: Identifier }>(
  records: readonly R[],
  parentSource: SourcePath<R>,
): RecordTreeNode<R>[] {
  const nodes = new Map<string, RecordTreeNode<R>>();
  const order = new Map<string, number>();
  for (const record of records) {
    const id = String(record.id);
    if (nodes.has(id)) continue;
    order.set(id, nodes.size);
    nodes.set(id, { record, children: [] });
  }

  // parents.get(id) is the id of the node to nest under, or null for a root.
  const parents = new Map<string, string | null>();
  for (const [id, node] of nodes) {
    const value = getAtPath(node.record, parentSource);
    const parent = value == null || value === "" ? null : String(value);
    parents.set(
      id,
      parent !== null && parent !== id && nodes.has(parent) ? parent : null,
    );
  }

  // Walk up from each node. A walk that meets a node already on its own path
  // found a cycle: cut it at the member that comes first in list order.
  const settled = new Set<string>();
  for (const start of nodes.keys()) {
    const path: string[] = [];
    const onPath = new Set<string>();
    let current: string | null = start;
    while (current !== null && !settled.has(current)) {
      if (onPath.has(current)) {
        const cycle = path.slice(path.indexOf(current));
        const first = cycle.reduce((a, b) =>
          (order.get(a) as number) < (order.get(b) as number) ? a : b,
        );
        parents.set(first, null);
        break;
      }
      path.push(current);
      onPath.add(current);
      current = parents.get(current) ?? null;
    }
    for (const id of path) settled.add(id);
  }

  const roots: RecordTreeNode<R>[] = [];
  for (const [id, node] of nodes) {
    const parent = parents.get(id) ?? null;
    const siblings =
      parent === null
        ? roots
        : (nodes.get(parent) as RecordTreeNode<R>).children;
    siblings.push(node);
  }
  return roots;
}
