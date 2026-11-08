/**
 * `<ColumnsButton>` — a popover that shows, hides and reorders the columns of
 * a `<DataTable>` and remembers the choice in the store. Ported from shadmin's
 * `ColumnsButton`; the list itself is `<FieldsSelector>`. The table publishes
 * its columns into the store (see `useDataTableColumns`) and this button,
 * which cannot see the table's children, reads them back.
 */

import { defaultDataTableStoreKey } from "@chelone/core";
import { Columns3 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCheloneStore } from "../../../context";
import { useDataTableColumns } from "../../../data-table-columns-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";
import { FieldsSelector } from "./fields-selector";

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
  const { columns } = useDataTableColumns({ storeKey: resolvedStoreKey });
  const translate = useTranslate();
  const empty = columns.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={variant} disabled={empty} {...buttonProps}>
          <Columns3 />
          {translate("chelone.action.select_columns", { _: "Columns" })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex flex-col gap-3">
        <FieldsSelector storeKey={resolvedStoreKey} resource={resource} />
      </PopoverContent>
    </Popover>
  );
}

export { ColumnsButton, type ColumnsButtonProps };
