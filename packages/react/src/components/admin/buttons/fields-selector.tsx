/**
 * `<FieldsSelector>` — the list of columns inside `<ColumnsButton>`, on its
 * own so the inspector can show it. It reads the columns a `<DataTable>`
 * published under `storeKey` (see `useDataTableColumns`). `listAs` and `rowAs`
 * replace the `ul` and each `li`, so a drag add-on can wrap them without this
 * entry importing a drag package.
 */

import {
  arrangeColumns,
  columnLabelMatches,
  SEARCH_THRESHOLD,
} from "@chelone/core";
import { ArrowDown, ArrowUp, RotateCcw, X } from "lucide-react";
import { type ComponentType, type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDataTableColumns } from "../../../data-table-columns-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useTranslateLabel } from "../../../label";
import { useResourceContext } from "../../../resource";

interface FieldsSelectorListProps {
  /** The ids of the listed rows, in display order. */
  ids: readonly string[];
  /** True while searching, when the order on screen is not the real order. */
  disabled: boolean;
  /** Move the column `id` to `index` in the full order. */
  onMove: (id: string, index: number) => void;
  children: ReactNode;
}

interface FieldsSelectorRowProps {
  id: string;
  /** The row's position in the full order, not among the search results. */
  index: number;
  disabled: boolean;
  children: ReactNode;
}

interface FieldsSelectorProps {
  /** The store key the table uses. */
  storeKey: string;
  /** The resource, used to label columns. Defaults to the resource context. */
  resource?: string;
  /** Replaces the `ul` around the rows. */
  listAs?: ComponentType<FieldsSelectorListProps>;
  /** Replaces the `li` around each row. */
  rowAs?: ComponentType<FieldsSelectorRowProps>;
}

function DefaultList({ children }: FieldsSelectorListProps) {
  return <ul className="flex flex-col gap-1">{children}</ul>;
}

function DefaultRow({ children }: FieldsSelectorRowProps) {
  return <li className="flex items-center gap-2">{children}</li>;
}

/**
 * A search box (above five columns), a row per published column with a switch
 * and move buttons, and a Reset button.
 *
 * @example
 * import { FieldsSelector } from "@chelone/react";
 *
 * const Panel = () => <FieldsSelector storeKey="posts.datatable" />;
 */
function FieldsSelector({
  storeKey,
  resource: resourceProp,
  listAs: List = DefaultList,
  rowAs: Row = DefaultRow,
}: FieldsSelectorProps) {
  const resource = useResourceContext({ resource: resourceProp });
  const { columns, hidden, order, toggle, move, moveTo, reset } =
    useDataTableColumns({ storeKey });
  const translate = useTranslate();
  const translateLabel = useTranslateLabel();
  const searchId = useId();
  const [query, setQuery] = useState("");

  const columnIds = columns.map((column) => column.id);
  const arranged = arrangeColumns(columnIds, { hidden: [], order });
  const rows = arranged.flatMap((index) => {
    const column = columns[index];
    if (!column) return [];
    const label = translateLabel({
      label: column.label,
      source: column.source,
      resource,
    });
    return [
      {
        id: column.id,
        label: typeof label === "string" && label !== "" ? label : column.id,
      },
    ];
  });
  const visibleRows = rows.filter((row) =>
    columnLabelMatches(row.label, query),
  );
  const searching = query !== "";

  const moveUp = translate("chelone.action.move_column_up", { _: "Move up" });
  const moveDown = translate("chelone.action.move_column_down", {
    _: "Move down",
  });

  return (
    <>
      {rows.length > SEARCH_THRESHOLD ? (
        <div className="relative">
          <Input
            id={searchId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={translate("chelone.action.search_columns", {
              _: "Search columns",
            })}
            className="pr-9"
          />
          {searching ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 size-9"
              aria-label={translate("chelone.action.clear_input_value", {
                _: "Clear",
              })}
              onClick={() => setQuery("")}
            >
              <X />
            </Button>
          ) : null}
        </div>
      ) : null}
      <List
        ids={visibleRows.map((row) => row.id)}
        disabled={searching}
        onMove={moveTo}
      >
        {visibleRows.map((row) => {
          const index = rows.findIndex((entry) => entry.id === row.id);
          return (
            <Row key={row.id} id={row.id} index={index} disabled={searching}>
              <Switch
                size="sm"
                checked={!hidden.includes(row.id)}
                onCheckedChange={() => toggle(row.id)}
                aria-label={row.label}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {row.label}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${moveUp} ${row.label}`}
                disabled={searching || index === 0}
                onClick={() => move(row.id, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${moveDown} ${row.label}`}
                disabled={searching || index === rows.length - 1}
                onClick={() => move(row.id, 1)}
              >
                <ArrowDown />
              </Button>
            </Row>
          );
        })}
      </List>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        <RotateCcw />
        {translate("chelone.action.reset_columns", { _: "Reset" })}
      </Button>
    </>
  );
}

export {
  FieldsSelector,
  type FieldsSelectorListProps,
  type FieldsSelectorProps,
  type FieldsSelectorRowProps,
};
