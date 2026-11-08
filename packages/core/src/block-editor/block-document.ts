import type { StandardSchemaV1 } from "@tanstack/form-core";
import { columnLabelMatches } from "../controller/data-table-columns";
import {
  describeField,
  type FieldDescriptor,
} from "../resource/describe-resource";

/** The dnd-kit id of the block editor's drag handle, shared by both adapters. */
export const HANDLE_ID = "block-drag-handle";

/** Prefix of the dnd-kit id of each drop gap, followed by the gap's index. */
export const GAP_PREFIX = "block-gap-";

// type-escape: tiptap attrs are open JSON, so the keys and values are not knowable here
export type Attrs = Record<string, unknown>;

/** The shape of tiptap JSON, with no tiptap import. */
export interface BlockDocNode {
  type?: string;
  attrs?: Attrs;
  content?: BlockDocNode[];
  marks?: { type: string; attrs?: Attrs }[];
  text?: string;
}

// type-escape: a schema's input is whatever its caller's form feeds it
type BlockSchema<A extends Attrs> = StandardSchemaV1<unknown, A>;

/**
 * One block a block editor can insert. `schema` is a Zod object (3 or 4) whose
 * output is the block's attrs. Adapters extend this with their render types.
 */
export interface BlockSpec<A extends Attrs = Attrs> {
  name: string;
  label: string;
  group: string;
  keywords?: string[];
  description?: string;
  schema: BlockSchema<A>;
  content?: string;
  atom?: boolean;
}

export interface BlockRegistry<B extends BlockSpec = BlockSpec> {
  get(name: string): B | undefined;
  list(): B[];
  names(): string[];
  /** Group names in the order a block first names them. */
  groups(): string[];
}

export const unknownBlockType = "unknownBlock";

const builtInNodes: ReadonlySet<string> = new Set([
  "doc",
  "text",
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  unknownBlockType,
]);

export function createBlockRegistry<B extends BlockSpec>(
  blocks: readonly B[],
): BlockRegistry<B> {
  const byName = new Map<string, B>();
  const groups = new Set<string>();
  for (const block of blocks) {
    if (builtInNodes.has(block.name)) {
      throw new Error(`block-editor: "${block.name}" is a built-in node`);
    }
    if (byName.has(block.name)) {
      throw new Error(`block-editor: duplicate block name "${block.name}"`);
    }
    byName.set(block.name, block);
    groups.add(block.group);
  }
  return {
    get: (name) => byName.get(name),
    list: () => [...byName.values()],
    names: () => [...byName.keys()],
    groups: () => [...groups],
  };
}

interface Parsable {
  // type-escape: a member of either Zod major, whose output is its own
  safeParse(value: undefined): { success: boolean; data?: unknown };
}

const isObject = (value: unknown): value is Attrs =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isParsable = (value: unknown): value is Parsable =>
  isObject(value) && typeof value.safeParse === "function";

/** Zod 3 and Zod 4 objects both expose `shape`. */
function shapeOf(schema: object): Attrs {
  const shape = isObject(schema) ? schema.shape : undefined;
  if (!isObject(shape)) throw new Error("block schema must be a z.object");
  return shape;
}

/** Each key's `safeParse(undefined)` result when it succeeds, else `null`. */
export function getBlockDefaultAttrs<A extends Attrs>(
  schema: BlockSchema<A>,
): { [K in keyof A]: A[K] | null } {
  const shape = shapeOf(schema);
  const defaults: Attrs = {};
  for (const key of Object.keys(shape)) {
    const member = shape[key];
    const result = isParsable(member) ? member.safeParse(undefined) : undefined;
    defaults[key] = result?.success ? result.data : null;
  }
  // type-escape: each key holds its member's default or null, which is the mapped type
  return defaults as { [K in keyof A]: A[K] | null };
}

/** One descriptor per attr, for an adapter to build the block's config form from. */
export function describeBlockAttrs(
  schema: BlockSchema<Attrs>,
): FieldDescriptor<string>[] {
  const shape = shapeOf(schema);
  return Object.keys(shape).map((key) =>
    describeField(key, shape[key], undefined),
  );
}

export function matchBlocks<B extends BlockSpec>(
  blocks: readonly B[],
  query: string,
): B[] {
  return blocks.filter(
    (block) =>
      columnLabelMatches(block.label, query) ||
      (block.keywords ?? []).some((keyword) =>
        columnLabelMatches(keyword, query),
      ) ||
      (block.description !== undefined &&
        columnLabelMatches(block.description, query)),
  );
}

const transparentTypes = new Set(["doc", "text"]);

function mapChildren(
  node: BlockDocNode,
  visit: (child: BlockDocNode) => BlockDocNode,
): BlockDocNode {
  return node.content === undefined
    ? node
    : { ...node, content: node.content.map(visit) };
}

/**
 * Wraps each node of an unknown type in an `unknownBlock`, so the editor keeps
 * it. `canLoad` also catches what a type name cannot: an unknown mark, or an
 * unknown node inside a paragraph. A top-level block it rejects is wrapped
 * whole, from the document as stored.
 */
export function wrapUnknownBlocks(
  doc: BlockDocNode,
  known: ReadonlySet<string>,
  canLoad?: (block: BlockDocNode) => boolean,
): BlockDocNode {
  const wrapNode = (node: BlockDocNode): BlockDocNode => {
    if (
      node.type !== undefined &&
      (transparentTypes.has(node.type) || known.has(node.type))
    ) {
      return mapChildren(node, wrapNode);
    }
    return { type: unknownBlockType, attrs: { payload: node } };
  };
  const wrapped = mapChildren(doc, wrapNode);
  if (canLoad === undefined || wrapped.content === undefined) return wrapped;
  return {
    ...wrapped,
    content: wrapped.content.map((block, index) =>
      canLoad(block)
        ? block
        : {
            type: unknownBlockType,
            attrs: { payload: doc.content?.[index] ?? block },
          },
    ),
  };
}

const isDocNode = (value: unknown): value is BlockDocNode => isObject(value);

export function unwrapUnknownBlocks(doc: BlockDocNode): BlockDocNode {
  const unwrapNode = (node: BlockDocNode): BlockDocNode => {
    const payload = node.attrs?.payload;
    if (node.type === unknownBlockType && isDocNode(payload)) return payload;
    return mapChildren(node, unwrapNode);
  };
  return mapChildren(doc, unwrapNode);
}

/** A stored value an editor can load: an object whose `type` is `"doc"`. */
export const isBlockDoc = (value: unknown): value is BlockDocNode =>
  isObject(value) && value.type === "doc";

export const emptyBlockDocument = (): BlockDocNode => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export function isEmptyBlockDocument(
  value: BlockDocNode | null | undefined,
): boolean {
  if (value === null || value === undefined) return true;
  return (value.content ?? []).every(
    (node) =>
      node.type === "paragraph" &&
      (node.content === undefined || node.content.length === 0),
  );
}

const youTubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);
const youTubeId = /^[A-Za-z0-9_-]{11}$/;
const vimeoId = /^\d+$/;

/** An embed URL for a YouTube or Vimeo link, built from the checked id alone. */
export function toEmbedSrc(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const { hostname, pathname } = parsed;
  if (youTubeHosts.has(hostname) && pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    return id !== null && youTubeId.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  }
  if (hostname === "youtu.be") {
    const id = pathname.slice(1);
    return youTubeId.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  }
  if (hostname === "vimeo.com" || hostname === "www.vimeo.com") {
    const id = pathname.slice(1);
    return vimeoId.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}
