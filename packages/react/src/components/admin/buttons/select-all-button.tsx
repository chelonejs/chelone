/**
 * `<SelectAllButton>` — selects up to `limit` rows of the list, beyond the
 * current page. Ported from shadmin `buttons/select-all-button.tsx`. The
 * `queryOptions` prop is dropped: core's `selectAll` takes only `limit` and
 * warns itself when it stops there.
 */

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";

interface SelectAllButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick" | "children"> {
  label?: ReactNode;
  /** The most rows to select. */
  limit?: number;
  onClick?: () => void;
}

/**
 * A button that selects every row of the list up to `limit`.
 *
 * Renders nothing until every row of the current page is selected, and again
 * once the whole list or `limit` rows are selected.
 *
 * @example
 * import { SelectAllButton } from "@chelone/react";
 *
 * const MyBulkActions = () => <SelectAllButton limit={500} />;
 */
function SelectAllButton({
  label = "ra.action.select_all",
  limit = 250,
  onClick,
  ...rest
}: SelectAllButtonProps) {
  const translate = useTranslate();
  const { data, total, selectedIds, selectAll } = useListContext();

  if (data === undefined) return null;
  if (total === selectedIds.length) return null;
  if (selectedIds.length >= limit) return null;
  if (data.some((record) => !selectedIds.includes(record.id))) return null;

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await selectAll({ limit });
    onClick?.();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      {...rest}
      onClick={handleClick}
    >
      {typeof label === "string"
        ? translate(label, { _: "Select all" })
        : label}
    </Button>
  );
}

export { SelectAllButton, type SelectAllButtonProps };
