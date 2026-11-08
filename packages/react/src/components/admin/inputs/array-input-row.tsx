import type { ArrayRow } from "@chelone/core";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IteratorRowProvider, useIteratorItem } from "../../../array-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useArrayInputResult } from "./array-input-context";

interface ArrayInputRowProps {
  /** The stable-id row this wrapper scopes and controls. */
  row: ArrayRow;
  /** The nested inputs, repeated per row. */
  children?: ReactNode;
}

function ArrayInputRowControls({ children }: { children?: ReactNode }) {
  const item = useIteratorItem();
  const translate = useTranslate();
  return (
    <div data-slot="array-input-row" className="flex items-start gap-2">
      <div className="flex flex-1 flex-col gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-1 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={item.index === 0}
          aria-label={translate("chelone.action.move_up", { _: "Move up" })}
          onClick={() => item.reOrder(item.index - 1)}
        >
          <span aria-hidden="true">↑</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={item.index >= item.total - 1}
          aria-label={translate("chelone.action.move_down", { _: "Move down" })}
          onClick={() => item.reOrder(item.index + 1)}
        >
          <span aria-hidden="true">↓</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          data-slot="array-input-remove"
          aria-label={translate("chelone.action.remove", { _: "Remove" })}
          onClick={() => item.remove()}
        >
          <span aria-hidden="true">×</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * One iterator row inside an `<ArrayInput>`. Scopes its children under
 * `${source}[${index}]` (so `<TextInput source="sku" />` binds `items[0].sku`
 * and a sourceless child binds `tags[0]`) and renders remove and reorder
 * controls wired to the ambient array input. Key each row with `row.id`, not
 * the index, so React keeps the DOM node and focus through reorders.
 *
 * @example
 * <ArrayInput source="items">
 *   <Rows />
 * </ArrayInput>
 *
 * function Rows() {
 *   const { rows } = useArrayInputResult();
 *   return rows.map((row) => (
 *     <ArrayInputRow key={row.id} row={row}>
 *       <TextInput source="sku" />
 *     </ArrayInputRow>
 *   ));
 * }
 */
function ArrayInputRow({ row, children }: ArrayInputRowProps): ReactNode {
  // Throws the clear error outside an <ArrayInput> before the row provider.
  useArrayInputResult();
  return (
    <IteratorRowProvider row={row}>
      <ArrayInputRowControls>{children}</ArrayInputRowControls>
    </IteratorRowProvider>
  );
}

export { ArrayInputRow, type ArrayInputRowProps };
