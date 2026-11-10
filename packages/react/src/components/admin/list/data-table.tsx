import {
  arrangeColumns,
  type DataTableColumnInfo,
  defaultDataTableStoreKey,
  getAtPath,
  getDataTableColumnId,
  type Identifier,
  type LooseRecord,
  type ResourceRecord,
  type SortPayload,
  type SourceProp,
} from "@chelone/core";
import {
  ArrowDownAZ,
  ArrowUpZA,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import {
  Children,
  type ComponentType,
  createContext,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDataTableColumns } from "../../../data-table-columns-hooks";
import { useListContext } from "../../../form";
import { cn } from "../../../lib/utils";
import { useListSortContext } from "../../../list/list-slice-hooks";
import {
  RecordContextProvider,
  useRecordContext,
} from "../../../record/record-context";
import { useResourceContext, useResourceDefinition } from "../../../resource";
import { useGetPathForRecord, useNavigate } from "../../../router";
import { Alert, AlertDescription } from "../../ui/alert";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Collapsible, CollapsibleContent } from "../../ui/collapsible";
import { Skeleton } from "../../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { FieldLabelText } from "../common/field-label-text";
import { NumberField } from "../fields/number-field";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";

/* -------------------------------------------------------------------------- */
/* Contexts (render-pass + size + expand)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Which render pass a `DataTable.Col` is inside. Chelone drops ra-core's
 * `"columnsSelector"` pass: the table publishes its columns to the store and
 * `ColumnsButton` reads them there, so a column renders as a header cell in
 * the head pass and a body cell in the data pass.
 */
type DataTableRenderPass = "header" | "data";
const DataTableRenderContext = createContext<DataTableRenderPass>("data");
const useDataTableRenderPass = () => use(DataTableRenderContext);

type DataTableSize = "small" | "medium";
const DataTableSizeContext = createContext<DataTableSize>("medium");
const useDataTableSizeContext = () => use(DataTableSizeContext);

interface DataTableExpandProps<TRecord extends ResourceRecord = LooseRecord> {
  id: Identifier;
  record: TRecord;
  resource: string;
}

interface DataTableBodyProps<TRecord extends ResourceRecord = LooseRecord> {
  children?: ReactNode;
  rowClassName?: (record: TRecord, rowIndex: number) => string | undefined;
}

interface DataTableExpandContextValue<
  TRecord extends ResourceRecord = LooseRecord,
> {
  expand: ReactElement | ComponentType<DataTableExpandProps<TRecord>> | null;
  expandedIds: Identifier[];
  toggleExpand: (id: Identifier) => void;
  setExpandedIds: (ids: Identifier[]) => void;
  expandSingle: boolean;
  isRowExpandable?: (record: TRecord) => boolean;
}
// A context cannot carry the table's record type, so it holds the value at
// `ResourceRecord`: the table casts it in and the hooks below cast it back out.
const DataTableExpandContext =
  createContext<DataTableExpandContextValue<ResourceRecord> | null>(null);
const useDataTableExpandContext = <
  TRecord extends ResourceRecord = LooseRecord,
>() =>
  // type-escape: context: the table published its expand context at its own record type, which the caller names
  use(DataTableExpandContext) as DataTableExpandContextValue<TRecord> | null;

/**
 * Whether the current DataTable renders selection checkboxes. Set by the top
 * `<DataTable>` from its `bulkActionButtons`/`bulkActionsToolbar` props and read
 * by the head/row so a table without bulk actions omits the checkbox column.
 */
const DataTableBulkContext = createContext<boolean>(false);
const useDataTableHasBulk = () => use(DataTableBulkContext);

/* -------------------------------------------------------------------------- */
/* DataTable                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A data table with per-column sorting, row selection, and expandable rows.
 *
 * Ported from shadmin's `<DataTable>`, rewired off chelone's single
 * `useListContext` (chelone has no `DataTableBase` / `useDataTable*Context`
 * substrate — the table reads the list-controller result directly). The table
 * hides and orders its columns from the store and publishes them there (see
 * `useDataTableColumns`); the picker UI is `ColumnsButton`, outside the table.
 * `bulkActionButtons` defaults to `false`; pass your own bulk children (or a
 * `bulkActionsToolbar`) to enable selection.
 *
 * @example
 * <List>
 *   <DataTable>
 *     <DataTable.Col source="title" />
 *     <DataTable.Col label="Author">
 *       <ReferenceField source="author_id" reference="authors" />
 *     </DataTable.Col>
 *   </DataTable>
 * </List>
 */
function DataTable<TRecord extends ResourceRecord = LooseRecord>(
  props: DataTableProps<TRecord>,
) {
  const {
    children,
    className,
    rowClassName,
    bulkActionButtons = false,
    bulkActionsToolbar,
    expand,
    expandSingle = false,
    isRowExpandable,
    size = "medium",
    hover,
    body: BodyComponent = DataTableBody,
    head: HeadComponent = DataTableHead,
    rowClick,
    storeKey,
    defaultHiddenColumns,
  } = props;

  const { data, isPending } = useListContext<TRecord>();
  const resource = useResourceContext();

  const elements = Children.toArray(children);
  // A child that is not an element (text, a Fragment's contents) has no id: it
  // stays in place and is always shown.
  const columnProps = elements.map((child) =>
    isValidElement<DataTableColumnProps>(child) ? child.props : undefined,
  );
  const ids = columnProps.map((p) => p && getDataTableColumnId(p));
  // Read from the children, not the published columns: those are only written
  // after the first commit, which would show a defaultHidden column for a frame.
  const childDefaultHidden = ids.filter(
    (id, index): id is string =>
      id !== undefined && !!columnProps[index]?.defaultHidden,
  );
  const hiddenByDefault = defaultHiddenColumns ?? childDefaultHidden;
  const { hidden, order, publish } = useDataTableColumns({
    storeKey: storeKey ?? defaultDataTableStoreKey(resource ?? ""),
    defaultHiddenColumns: hiddenByDefault,
  });
  const visibleChildren = arrangeColumns(ids, { hidden, order }).map(
    (index) => elements[index],
  );

  const published = new Map<string, DataTableColumnInfo>();
  columnProps.forEach((p, index) => {
    const id = ids[index];
    if (!p || id === undefined || published.has(id)) return;
    published.set(id, {
      id,
      source: p.source,
      ...(typeof p.label === "string" ? { label: p.label } : {}),
      // The picker reads these flags, so they must follow the table's own defaults.
      ...(hiddenByDefault.includes(id) ? { defaultHidden: true } : {}),
    });
  });
  const publishedJson = JSON.stringify([...published.values()]);
  // After mount, never during render, so server rendering writes nothing.
  useEffect(() => {
    publish(JSON.parse(publishedJson));
  }, [publish, publishedJson]);

  const hasBulkActions = !!bulkActionsToolbar || bulkActionButtons !== false;

  const [expandedIds, setExpandedIds] = useState<Identifier[]>([]);
  const toggleExpand = useCallback(
    (id: Identifier) => {
      setExpandedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        return expandSingle ? [id] : [...prev, id];
      });
    },
    [expandSingle],
  );
  const expandContextValue =
    useMemo<DataTableExpandContextValue<TRecord> | null>(
      () =>
        expand
          ? {
              expand,
              expandedIds,
              toggleExpand,
              setExpandedIds,
              expandSingle,
              isRowExpandable,
            }
          : null,
      [expand, expandedIds, toggleExpand, expandSingle, isRowExpandable],
    );

  const erasedExpandContext =
    // type-escape: context: holds the value at `ResourceRecord`; the hooks read it back at this table's record
    expandContextValue as DataTableExpandContextValue<ResourceRecord> | null;

  const nbColumns = visibleChildren.length;

  return (
    <DataTableRowClickContext.Provider
      // type-escape: context: holds `rowClick` at `ResourceRecord`; the row reads it back at this table's record
      value={(rowClick ?? "edit") as DataTableProps<ResourceRecord>["rowClick"]}
    >
      <DataTableBulkContext.Provider value={hasBulkActions}>
        <DataTableExpandContext.Provider value={erasedExpandContext}>
          <DataTableSizeContext.Provider value={size}>
            <DataTableHoverContext.Provider value={hover ?? true}>
              {isPending ? (
                <DataTableLoadingSkeleton
                  className={className}
                  hasBulkActions={hasBulkActions}
                  nbColumns={nbColumns}
                />
              ) : !data || data.length === 0 ? (
                <div className={cn("rounded-md border p-4", className)}>
                  <DataTableEmpty />
                </div>
              ) : (
                <div className={cn("rounded-md border", className)}>
                  <Table>
                    <DataTableRenderContext.Provider value="header">
                      <HeadComponent>{visibleChildren}</HeadComponent>
                    </DataTableRenderContext.Provider>
                    <DataTableRenderContext.Provider value="data">
                      {createElement(
                        BodyComponent,
                        { rowClassName },
                        visibleChildren,
                      )}
                    </DataTableRenderContext.Provider>
                  </Table>
                </div>
              )}
              {bulkActionsToolbar ??
                (bulkActionButtons !== false ? (
                  <BulkActionsToolbar>{bulkActionButtons}</BulkActionsToolbar>
                ) : null)}
            </DataTableHoverContext.Provider>
          </DataTableSizeContext.Provider>
        </DataTableExpandContext.Provider>
      </DataTableBulkContext.Provider>
    </DataTableRowClickContext.Provider>
  );
}

const DataTableHoverContext = createContext<boolean>(true);
const useDataTableHoverContext = () => use(DataTableHoverContext);

const DataTableRowClickContext =
  createContext<DataTableProps<ResourceRecord>["rowClick"]>("edit");
const useDataTableRowClickContext = <
  TRecord extends ResourceRecord = LooseRecord,
>() =>
  // type-escape: context: the table published its `rowClick` at its own record type, which the caller names
  use(DataTableRowClickContext) as DataTableProps<TRecord>["rowClick"];

DataTable.Col = DataTableColumn;
DataTable.NumberCol = DataTableNumberColumn;

/* -------------------------------------------------------------------------- */
/* Head                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Header row of a DataTable, including the select-page checkbox column when bulk
 * actions are enabled.
 */
function DataTableHead({ children }: { children: ReactNode }) {
  const { data, selectedIds, select } = useListContext();
  const hasBulkActions = useDataTableHasBulk();
  const expandContext = useDataTableExpandContext();

  const selectableIds = Array.isArray(data)
    ? data.map((record) => record.id)
    : [];
  const allSelected =
    selectedIds.length > 0 &&
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = (checked: boolean | "indeterminate") => {
    if (!data) return;
    if (checked === true) {
      select(
        selectedIds.concat(
          selectableIds.filter((id) => !selectedIds.includes(id)),
        ),
      );
    } else {
      select(selectedIds.filter((id) => !selectableIds.includes(id)));
    }
  };

  return (
    <TableHeader>
      <TableRow>
        {hasBulkActions ? (
          <TableHead className="w-8">
            <Checkbox
              onCheckedChange={handleToggleSelectAll}
              checked={allSelected}
              className="mb-2"
              aria-label="Select all rows on this page"
            />
          </TableHead>
        ) : null}
        {expandContext ? (
          <TableHead className="w-8">
            {!expandContext.expandSingle && <ExpandAllButton />}
          </TableHead>
        ) : null}
        {children}
      </TableRow>
    </TableHeader>
  );
}

function ExpandAllButton() {
  const expandContext = useDataTableExpandContext();
  const { data } = useListContext<LooseRecord>();
  if (!expandContext || !data) return null;
  const allExpanded =
    data.length > 0 &&
    data.every((r) => expandContext.expandedIds.includes(r.id));
  const handleClick = () => {
    if (allExpanded || expandContext.expandedIds.length > 0) {
      expandContext.setExpandedIds([]);
    } else {
      const expandableIds = expandContext.isRowExpandable
        ? data
            .filter((r) => expandContext.isRowExpandable?.(r))
            .map((r) => r.id)
        : data.map((r) => r.id);
      expandContext.setExpandedIds(expandableIds);
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={handleClick}
      aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}
    >
      <ChevronsUpDown />
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* Body + Row                                                                 */
/* -------------------------------------------------------------------------- */

/** Body of a DataTable — one `<DataTableRow>` per record in the current page. */
function DataTableBody<TRecord extends ResourceRecord = LooseRecord>({
  children,
  rowClassName,
}: DataTableBodyProps<TRecord>) {
  const { data } = useListContext<TRecord>();
  const hasBulkActions = useDataTableHasBulk();
  const expandContext = useDataTableExpandContext<TRecord>();
  const resource = useResourceContext();
  const nbVisibleChildren = Children.count(children);
  const expandColSpan =
    nbVisibleChildren + (hasBulkActions ? 1 : 0) + (expandContext ? 1 : 0);
  return (
    <TableBody>
      {data?.map((record, rowIndex) => {
        const key = record.id ?? `row${rowIndex}`;
        const isExpanded = expandContext?.expandedIds.includes(record.id);
        const expandPanel = expandContext?.expand
          ? isValidElement(expandContext.expand)
            ? expandContext.expand
            : createElement(expandContext.expand, {
                id: record.id,
                record: record,
                resource: resource ?? "",
              })
          : null;
        return (
          <RecordContextProvider value={record} key={key}>
            <DataTableRow<TRecord> className={rowClassName?.(record, rowIndex)}>
              {children}
            </DataTableRow>
            {expandContext ? (
              <TableRow data-slot="data-table-expand-panel">
                <TableCell colSpan={expandColSpan} className="p-0">
                  <Collapsible open={!!isExpanded}>
                    <CollapsibleContent>
                      <div className="bg-muted/30 px-4 py-3">{expandPanel}</div>
                    </CollapsibleContent>
                  </Collapsible>
                </TableCell>
              </TableRow>
            ) : null}
          </RecordContextProvider>
        );
      })}
    </TableBody>
  );
}

/** A row — wires row-click navigation + a row-selection checkbox. */
function DataTableRow<TRecord extends ResourceRecord = LooseRecord>({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { selectedIds, toggleItem } = useListContext();
  const hasBulkActions = useDataTableHasBulk();
  const hover = useDataTableHoverContext();
  const rowClick = useDataTableRowClickContext<TRecord>();
  const expandContext = useDataTableExpandContext<TRecord>();

  const record = useRecordContext<TRecord>();
  if (!record) {
    throw new Error("DataTableRow can only be used within a RecordContext");
  }
  const resource = useResourceContext();
  if (!resource) {
    throw new Error("DataTableRow can only be used within a ResourceContext");
  }

  const navigate = useNavigate();
  const definition = useResourceDefinition();
  const link =
    typeof rowClick === "function" ? rowClick(record, record.id) : rowClick;
  const path = useGetPathForRecord({
    resource,
    record,
    // useResourceDefinition returns optional hasShow/hasEdit; the path hook
    // needs concrete booleans — default a missing view to "absent".
    definition: {
      hasShow: definition.hasShow ?? false,
      hasEdit: definition.hasEdit ?? false,
    },
    link: link === "expand" || link === "toggleSelection" ? false : link,
  });

  const handleToggle = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      toggleItem(record.id);
    },
    [toggleItem, record.id],
  );

  const handleClick = useCallback(() => {
    if (link === "expand") {
      if (expandContext) expandContext.toggleExpand(record.id);
      return;
    }
    if (link === "toggleSelection") {
      toggleItem(record.id);
      return;
    }
    if (path === false || path == null) return;
    navigate(path, { state: { _scrollToTop: true } });
  }, [link, path, navigate, expandContext, record.id, toggleItem]);

  const isExpanded = expandContext?.expandedIds.includes(record.id) ?? false;
  const canExpand =
    expandContext != null &&
    (!expandContext.isRowExpandable || expandContext.isRowExpandable(record));
  const expandLabel = isExpanded ? "Collapse row" : "Expand row";
  const clickable = rowClick !== false;

  return (
    <TableRow
      onClick={clickable ? handleClick : undefined}
      className={cn(
        clickable && "cursor-pointer",
        hover === false && "hover:bg-transparent",
        className,
      )}
    >
      {hasBulkActions ? (
        <TableCell className="w-8">
          <div className="flex">
            <Checkbox
              checked={selectedIds.includes(record.id)}
              onClick={handleToggle}
              aria-label="Select row"
            />
          </div>
        </TableCell>
      ) : null}
      {expandContext ? (
        <TableCell className="w-8 p-0">
          {canExpand ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(event) => {
                event.stopPropagation();
                expandContext.toggleExpand(record.id);
              }}
              aria-label={expandLabel}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : null}
        </TableCell>
      ) : null}
      {children}
    </TableRow>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty + Loading                                                            */
/* -------------------------------------------------------------------------- */

/** Default empty-state placeholder rendered when a DataTable has no records. */
function DataTableEmpty() {
  return (
    <Alert>
      <AlertDescription>No results found.</AlertDescription>
    </Alert>
  );
}

function DataTableLoadingSkeleton({
  className,
  hasBulkActions,
  nbColumns,
  nbFakeLines = 5,
}: {
  className?: string;
  hasBulkActions?: boolean;
  nbColumns: number;
  nbFakeLines?: number;
}) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {hasBulkActions ? (
              <TableHead className="w-8">
                <Skeleton className="size-4" />
              </TableHead>
            ) : null}
            {Array.from({ length: nbColumns }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count loading skeleton placeholders with no data identity and stable order
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: nbFakeLines }).map((_, rowIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count loading skeleton placeholders with no data identity and stable order
            <TableRow key={rowIndex}>
              {hasBulkActions ? (
                <TableCell className="w-8">
                  <Skeleton className="size-4" />
                </TableCell>
              ) : null}
              {Array.from({ length: nbColumns }).map((_, colIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count loading skeleton placeholders with no data identity and stable order
                <TableCell key={colIndex} className="py-2">
                  <Skeleton className="h-4 w-full max-w-48" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Column (dispatch by render pass)                                           */
/* -------------------------------------------------------------------------- */

function DataTableColumn(props: DataTableColumnProps) {
  const pass = useDataTableRenderPass();
  return pass === "header" ? (
    <DataTableHeadCell {...props} />
  ) : (
    <DataTableCell {...props} />
  );
}

const oppositeOrder: Record<SortPayload["order"], SortPayload["order"]> = {
  ASC: "DESC",
  DESC: "ASC",
};

/** Header cell — renders the label + a click-to-sort affordance. */
function DataTableHeadCell(props: DataTableColumnProps) {
  const {
    disableSort,
    source,
    label,
    sortByOrder,
    className,
    headerClassName,
  } = props;
  const { sort, setSort } = useListSortContext();
  const resource = useResourceContext();
  const primarySort = sort[0];
  const isSorted = !!source && primarySort?.field === source;
  const isSortable = !disableSort && !!source;

  const handleSort = useCallback(() => {
    if (!source) return;
    const nextOrder = isSorted
      ? oppositeOrder[primarySort.order]
      : (sortByOrder ?? "ASC");
    setSort({ field: source, order: nextOrder });
  }, [source, isSorted, primarySort, sortByOrder, setSort]);

  return (
    <TableHead className={cn(className, headerClassName)}>
      {isSortable ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 -mr-2 h-8 data-[state=open]:bg-accent cursor-pointer"
              data-field={source}
              onClick={handleSort}
            >
              <FieldLabelText
                label={label}
                source={source}
                resource={resource}
              />
              {isSorted ? (
                primarySort.order === "ASC" ? (
                  <ArrowDownAZ className="size-6" />
                ) : (
                  <ArrowUpZA className="size-6" />
                )
              ) : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <FieldLabelText label={label} source={source} resource={resource} />
          </TooltipContent>
        </Tooltip>
      ) : (
        <FieldLabelText label={label} source={source} resource={resource} />
      )}
    </TableHead>
  );
}

/** Body cell — resolves the value from `children`, `render`, `field`, or `source`. */
function DataTableCell(props: DataTableColumnProps) {
  const {
    children,
    render,
    field,
    source,
    className,
    cellClassName,
    conditionalClassName,
  } = props;
  const record = useRecordContext();
  const size = useDataTableSizeContext();
  // Resolve the source value off the ambient row record (core's `getAtPath`, the
  // read `useFieldValue` makes). A column with no `source` reads nothing.
  const sourceValue: unknown = source ? getAtPath(record, source) : undefined;
  // Text as is, nothing when absent, `String` for a boolean or object.
  const sourceNode: ReactNode =
    typeof sourceValue === "string" || typeof sourceValue === "number"
      ? sourceValue
      : sourceValue === null || sourceValue === undefined
        ? null
        : String(sourceValue);
  if (!render && !field && !children && !source) {
    throw new Error(
      "DataTableColumn: Missing at least one of the following props: render, field, children, or source",
    );
  }
  return (
    <TableCell
      className={cn(
        // px-2 lines the cell text up with its header, whose sort button
        // pulls itself back over the header's own px-2.
        size === "small" ? "px-2 py-1" : "px-2 py-2",
        className,
        cellClassName,
        record && conditionalClassName?.(record),
      )}
    >
      {children ??
        (render
          ? record && render(record)
          : field
            ? createElement(field, { source })
            : sourceNode)}
    </TableCell>
  );
}

/** A right-aligned, number-formatted column (thin `NumberField` wrapper). */
function DataTableNumberColumn(props: DataTableNumberColumnProps) {
  const {
    source,
    options,
    locales,
    className,
    headerClassName,
    cellClassName,
    ...rest
  } = props;
  return (
    <DataTableColumn
      source={source}
      {...rest}
      className={className}
      headerClassName={cn("text-right", headerClassName)}
      cellClassName={cn("text-right", cellClassName)}
    >
      <NumberField source={source} options={options} locales={locales} />
    </DataTableColumn>
  );
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface DataTableColumnProps {
  className?: string;
  cellClassName?: string;
  headerClassName?: string;
  conditionalClassName?: (record: LooseRecord) => string | false | undefined;
  children?: ReactNode;
  render?: (record: LooseRecord) => ReactNode;
  field?: React.ElementType;
  source?: SourceProp;
  label?: ReactNode;
  disableSort?: boolean;
  sortByOrder?: SortPayload["order"];
  /** Hidden until a choice is stored, unless the table sets `defaultHiddenColumns`. */
  defaultHidden?: boolean;
}

interface DataTableNumberColumnProps extends DataTableColumnProps {
  source: SourceProp;
  locales?: string | string[];
  options?: Intl.NumberFormatOptions;
}

interface DataTableProps<TRecord extends ResourceRecord = LooseRecord> {
  children: ReactNode;
  className?: string;
  rowClassName?: (record: TRecord, rowIndex: number) => string | undefined;
  /**
   * Bulk-action children rendered in the selection toolbar. `false` (default)
   * disables selection entirely, so pass your own bulk children (or a
   * `bulkActionsToolbar`) to turn selection on.
   */
  bulkActionButtons?: ReactNode;
  /** A fully custom selection toolbar, overriding `bulkActionButtons`. */
  bulkActionsToolbar?: ReactNode;
  /**
   * Element or function component rendered as the expand panel under each row.
   * When provided, a chevron toggle column is added at the start of every row.
   */
  expand?: ReactElement | ComponentType<DataTableExpandProps<TRecord>>;
  /** Expanding a row collapses any previously-expanded one. Default `false`. */
  expandSingle?: boolean;
  /** Predicate deciding whether a given record can be expanded. */
  isRowExpandable?: (record: TRecord) => boolean;
  /** Disable row hover highlighting. Default `true` (hover on). */
  hover?: boolean;
  /** Row density. `"small"` tightens cell padding; `"medium"` (default) is standard. */
  size?: DataTableSize;
  /**
   * Store key prefix for the hidden, ordered and published columns. Default
   * `"<resource>.datatable"`.
   */
  storeKey?: string;
  /** Ids of the columns hidden until a choice is stored. */
  defaultHiddenColumns?: string[];
  /** Override the table body component. */
  body?: ComponentType<DataTableBodyProps<TRecord>>;
  /** Override the table head component. */
  head?: ComponentType<{ children: ReactNode }>;
  /**
   * Row-click action: `"edit"` (default) | `"show"` | `"expand"` |
   * `"toggleSelection"` | `false` | a path string | `(record, id) => …`.
   */
  rowClick?:
    | string
    | false
    | ((record: TRecord, id: Identifier) => string | false);
}

export {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableColumn,
  type DataTableColumnProps,
  DataTableEmpty,
  type DataTableExpandProps,
  DataTableHead,
  DataTableHeadCell,
  DataTableNumberColumn,
  type DataTableNumberColumnProps,
  type DataTableProps,
  DataTableRow,
};
