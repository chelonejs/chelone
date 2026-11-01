/**
 * `<ColumnsButton>` — a popover that shows, hides and reorders the columns of
 * a `<DataTable>` and remembers the choice in the store. Ported from shadmin's
 * `ColumnsButton`, minus drag and drop and the inspector: rows reorder with
 * move buttons, which work by keyboard and in jsdom. The table publishes its
 * columns into the store (see `useDataTableColumns`) and this button, which
 * cannot see the table's children, reads them back.
 */

import {
  arrangeColumns,
  columnLabelMatches,
  defaultDataTableStoreKey,
} from "@chelone/core";
import { ArrowDown, ArrowUp, Columns3, RotateCcw, X } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useCheloneStore } from "../../../context";
import { useDataTableColumns } from "../../../data-table-columns-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useTranslateLabel } from "../../../label";
import { useResourceContext } from "../../../resource";

const SEARCH_THRESHOLD = 5;

interface ColumnsButtonProps extends ComponentProps<typeof Button> {
  /** The resource whose table to control. Defaults to the resource context. */
  resource?: string;
  /** The store key the table uses. Defaults to the resource's own key. */
  storeKey?: string;
}

/**
 * A button that opens a panel listing the published columns of a `<DataTable>`,
 * each with a switch to show or hide it and buttons to move it.
 *
 * @example
 * import { ColumnsButton } from "@chelone/react";
 *
 * const MyActions = () => <ColumnsButton />;
 */
function ColumnsButton({
  resource: resourceProp,
  storeKey,
  variant = "outline",
  ...buttonProps
}: ColumnsButtonProps) {
  // The button cannot work without a store, so fail like `useStoreItem` does.
  useCheloneStore();
  const resource = useResourceContext({ resource: resourceProp });
  const resolvedStoreKey =
    storeKey ?? (resource ? defaultDataTableStoreKey(resource) : undefined);
  if (!resolvedStoreKey) {
    throw new Error(
      "<ColumnsButton> needs a resource, a storeKey or a resource context.",
    );
  }
  const { columns, hidden, order, toggle, move, reset } = useDataTableColumns({
    storeKey: resolvedStoreKey,
  });
  const translate = useTranslate();
  const translateLabel = useTranslateLabel();
  const searchId = useId();
  const [query, setQuery] = useState("");

  const empty = columns.length === 0;
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

  const moveUp = translate("ra.action.move_column_up", { _: "Move up" });
  const moveDown = translate("ra.action.move_column_down", { _: "Move down" });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={variant} disabled={empty} {...buttonProps}>
          <Columns3 />
          {translate("ra.action.select_columns", { _: "Columns" })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex flex-col gap-3">
        {rows.length > SEARCH_THRESHOLD ? (
          <div className="relative">
            <Input
              id={searchId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translate("ra.action.search_columns", {
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
                aria-label={translate("ra.action.clear_input_value", {
                  _: "Clear",
                })}
                onClick={() => setQuery("")}
              >
                <X />
              </Button>
            ) : null}
          </div>
        ) : null}
        <ul className="flex flex-col gap-1">
          {visibleRows.map((row) => {
            const index = rows.findIndex((entry) => entry.id === row.id);
            return (
              <li key={row.id} className="flex items-center gap-2">
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
              </li>
            );
          })}
        </ul>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RotateCcw />
          {translate("ra.action.reset_columns", { _: "Reset" })}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export { ColumnsButton, type ColumnsButtonProps };
