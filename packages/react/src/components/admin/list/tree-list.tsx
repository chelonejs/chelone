import {
  buildRecordTree,
  getAtPath,
  type Identifier,
  type LooseRecord,
  type RecordTreeNode,
  type ResourceRecord,
  type SourcePath,
  type SourceProp,
} from "@chelone/core";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import {
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { cn } from "../../../lib/utils";
import { useResourceContext, useResourceDefinition } from "../../../resource";
import { useCreatePath, useNavigate } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { ListNoResults } from "./list-no-results";
import { SimpleListLoading } from "./simple-list-loading";

export interface TreeListProps<TRecord extends ResourceRecord = LooseRecord> {
  /** The field holding the parent's id; a dotted path reads a nested value. */
  parentSource: SourceProp;
  /** The string field shown as the row title; the record representation otherwise. */
  titleSource?: SourceProp;
  /** The field whose value picks a component from `iconMap`. */
  iconSource?: SourceProp;
  iconMap?: Record<string, ComponentType<{ className?: string }>>;
  /** Whether branches start open. Default `false`. */
  defaultExpanded?: boolean;
  /** Called with the record when a row is selected, in place of navigating. */
  onSelect?: (record: TRecord) => void;
  /**
   * Where a row links to when `onSelect` is not given. `edit` by default,
   * `show` when the resource has no edit view, and an inert row when it has
   * neither. `false` leaves rows inert.
   */
  linkType?: "edit" | "show" | false;
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?: ReactNode;
  /** Rendered with no records, in place of `ListNoResults`. */
  empty?: ReactNode;
  className?: string;
}

/** What every `TreeListNode` needs from the `<TreeList>` above it. */
interface TreeListState<TRecord extends ResourceRecord> {
  isExpanded(id: Identifier): boolean;
  toggle(id: Identifier): void;
  select(record: TRecord): void;
  /** The row's link target; undefined when `onSelect` replaces the link. */
  hrefFor(record: TRecord): string | undefined;
  isSelectable(record: TRecord): boolean;
  titleFor(record: TRecord): ReactNode;
  iconFor(record: TRecord): ComponentType<{ className?: string }> | undefined;
  isTabStop(id: Identifier): boolean;
  setFocused(id: Identifier): void;
}

const treeItemOf = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest<HTMLElement>('[role="treeitem"]')
    : null;

function TreeListNode<TRecord extends ResourceRecord = LooseRecord>({
  node,
  level,
  tree,
}: {
  node: RecordTreeNode<TRecord>;
  /** Depth from 1 at the roots; becomes `aria-level`. */
  level: number;
  tree: TreeListState<TRecord>;
}) {
  const translate = useTranslate();
  const { Link } = useRouterAdapter();
  const { record, children } = node;
  const isBranch = children.length > 0;
  const open = isBranch && tree.isExpanded(record.id);
  const href = tree.hrefFor(record);
  const selectable = tree.isSelectable(record);
  const Icon = tree.iconFor(record);

  function onRowClick(event: MouseEvent<HTMLElement>) {
    if (!selectable) return;
    // A modified click keeps the browser's own link behaviour.
    const plain =
      event.button === 0 &&
      !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
    if (event.currentTarget instanceof HTMLAnchorElement && !plain) return;
    event.preventDefault();
    tree.select(record);
  }

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    const item = event.currentTarget;
    // The keydown of a nested treeitem bubbles through this one.
    if (treeItemOf(event.target) !== item) return;
    const all = Array.from(
      item
        .closest('[role="tree"]')
        ?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [],
    );
    const at = all.indexOf(item);
    let target: HTMLElement | null | undefined;
    switch (event.key) {
      case "ArrowDown":
        target = all[at + 1];
        break;
      case "ArrowUp":
        target = all[at - 1];
        break;
      case "Home":
        target = all[0];
        break;
      case "End":
        target = all[all.length - 1];
        break;
      case "ArrowRight":
        if (!isBranch) break;
        if (!open) tree.toggle(record.id);
        else
          target = item.querySelector<HTMLElement>(
            '[role="group"] > [role="treeitem"]',
          );
        break;
      case "ArrowLeft":
        if (open) tree.toggle(record.id);
        else
          target =
            item.parentElement?.closest<HTMLElement>('[role="treeitem"]');
        break;
      case "Enter":
      case " ":
        if (event.target !== item) return;
        if (selectable) tree.select(record);
        break;
      default:
        return;
    }
    event.preventDefault();
    target?.focus();
  }

  const rowProps = {
    "data-slot": "tree-list-row",
    tabIndex: -1,
    className: "flex min-w-0 flex-1 items-center gap-2 text-left",
    onClick: onRowClick,
  };
  const rowContent = (
    <>
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span data-slot="tree-list-title" className="truncate">
        {tree.titleFor(record)}
      </span>
    </>
  );

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-expanded={isBranch ? open : undefined}
      tabIndex={tree.isTabStop(record.id) ? 0 : -1}
      className="outline-none"
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        if (treeItemOf(event.target) === event.currentTarget) {
          tree.setFocused(record.id);
        }
      }}
    >
      <div className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm [li:focus-visible>&]:ring-2 [li:focus-visible>&]:ring-ring">
        {isBranch ? (
          <button
            type="button"
            data-slot="tree-list-chevron"
            tabIndex={-1}
            className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent"
            aria-label={
              open
                ? translate("chelone.action.collapse", { _: "Collapse" })
                : translate("chelone.action.expand", { _: "Expand" })
            }
            onClick={() => tree.toggle(record.id)}
          >
            {open ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}
        {href ? (
          <Link {...rowProps} to={href}>
            {rowContent}
          </Link>
        ) : selectable ? (
          <button {...rowProps} type="button">
            {rowContent}
          </button>
        ) : (
          <span {...rowProps}>{rowContent}</span>
        )}
      </div>
      {open ? (
        // biome-ignore lint/a11y/useSemanticElements: the tree pattern needs a ul group, not a fieldset
        <ul role="group" className="ml-5 flex flex-col">
          {children.map((child) => (
            <TreeListNode
              key={child.record.id}
              node={child}
              level={level + 1}
              tree={tree}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * The records of the ambient `<List>` as a collapsible tree, nested by a
 * parent field. A record whose parent is missing from the list (it may be on
 * another page) is a root, and a parent cycle still lists every record.
 *
 * It fetches nothing and sets no `perPage`, so give the `<List>` a `perPage`
 * that covers the whole tree. Rows are not drag targets: moving a record to
 * another parent stays with the edit form.
 *
 * @example
 * <List perPage={1000}>
 *   <TreeList parentSource="parent_id" titleSource="name" />
 * </List>
 */
function TreeList<TRecord extends ResourceRecord = LooseRecord>({
  parentSource,
  titleSource,
  iconSource,
  iconMap,
  defaultExpanded = false,
  onSelect,
  linkType,
  loading,
  empty,
  className,
}: TreeListProps<TRecord>) {
  const { data, isPending } = useListContext<TRecord>();
  const resource = useResourceContext();
  const getRepresentation = useGetRecordRepresentation(resource);
  const navigate = useNavigate();
  const createPath = useCreatePath();
  const { hasEdit, hasShow } = useResourceDefinition({ resource });

  // buildRecordTree walks the parent source with getAtPath, which reads any
  // string off any record.
  const roots = useMemo(
    () =>
      // type-escape: `parentSource` is the loose `SourceProp` a list source is.
      buildRecordTree<TRecord>(data ?? [], parentSource as SourcePath<TRecord>),
    [data, parentSource],
  );

  // Keyed by id, not by node, so a refetch that rebuilds the tree keeps it.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (id: Identifier) =>
    expanded[String(id)] ?? defaultExpanded;

  const [focusedId, setFocusedId] = useState<Identifier>();
  const visibleIds = (nodes: RecordTreeNode<TRecord>[]): Identifier[] =>
    nodes.flatMap(({ record, children }) => [
      record.id,
      ...(isExpanded(record.id) ? visibleIds(children) : []),
    ]);
  const visible = visibleIds(roots);
  const tabStop =
    focusedId !== undefined && visible.includes(focusedId)
      ? focusedId
      : visible[0];

  if (isPending) {
    return loading !== undefined ? (
      loading
    ) : (
      <SimpleListLoading className={className} />
    );
  }
  if (roots.length === 0) {
    return empty !== undefined ? empty : <ListNoResults />;
  }

  // A resource that registers neither view has no route to link to.
  const type =
    linkType ??
    (hasEdit !== false ? "edit" : hasShow !== false ? "show" : false);
  const linkTo = (record: TRecord) =>
    resource && type
      ? createPath({ resource, id: record.id, type })
      : undefined;

  const tree: TreeListState<TRecord> = {
    isExpanded,
    toggle: (id) =>
      setExpanded((current) => ({
        ...current,
        [String(id)]: !(current[String(id)] ?? defaultExpanded),
      })),
    select(record) {
      if (onSelect) return onSelect(record);
      const to = linkTo(record);
      if (to) navigate(to);
    },
    // A callback replaces the link, so the row is a button then.
    hrefFor: (record) => (onSelect ? undefined : linkTo(record)),
    isSelectable: (record) => !!onSelect || linkTo(record) !== undefined,
    titleFor(record) {
      const value = titleSource ? getAtPath(record, titleSource) : undefined;
      return typeof value === "string" ? value : getRepresentation(record);
    },
    iconFor(record) {
      if (!iconSource || !iconMap) return undefined;
      const value = getAtPath(record, iconSource);
      return value == null ? undefined : iconMap[String(value)];
    },
    isTabStop: (id) => tabStop === id,
    setFocused: setFocusedId,
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a ul with role tree is the WAI-ARIA tree pattern
    <ul role="tree" className={cn("flex flex-col", className)}>
      {roots.map((node) => (
        <TreeListNode key={node.record.id} node={node} level={1} tree={tree} />
      ))}
    </ul>
  );
}

export { TreeList };
