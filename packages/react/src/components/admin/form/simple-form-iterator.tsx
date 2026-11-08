import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import {
  cloneElement,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { IteratorRowProvider, useIteratorItem } from "../../../array-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { Confirm } from "../feedback/confirm";
import {
  useArrayInputAddLabel,
  useArrayInputResult,
} from "../inputs/array-input-context";

interface IteratorButtonProps {
  /** Extra classes on the button. */
  className?: string;
  /** Click handler; `<SimpleFormIterator>` wires this when it clones the element. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Disables the button. */
  disabled?: boolean;
}

interface AddItemButtonProps extends IteratorButtonProps {
  /**
   * Replaces the default "Add" label; a string is translated. Falls back to
   * the enclosing `<ArrayInput addLabel>`.
   */
  label?: ReactNode;
}

type RemoveItemButtonProps = IteratorButtonProps;

interface ReOrderButtonsProps {
  /** Extra classes on the button group. */
  className?: string;
  /** Disables both buttons. */
  disabled?: boolean;
}

/** An icon button with an accessible name, labelled by a tooltip. */
function IconButton({
  label,
  icon,
  className,
  ...rest
}: IteratorButtonProps & { label: string; icon: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-7", className)}
          aria-label={label}
          {...rest}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The default "Add" button of a {@link SimpleFormIterator}. */
function AddItemButton({
  label,
  className,
  ...rest
}: AddItemButtonProps): ReactNode {
  const translate = useTranslate();
  const addLabel = useArrayInputAddLabel();
  const shown = label ?? addLabel;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1", className)}
      data-slot="array-input-add"
      {...rest}
    >
      <Plus aria-hidden="true" className="size-4" />
      {shown == null
        ? translate("chelone.action.add", { _: "Add" })
        : typeof shown === "string"
          ? translate(shown, { _: shown })
          : shown}
    </Button>
  );
}

/** The default per-row remove button of a {@link SimpleFormIterator}. */
function RemoveItemButton(props: RemoveItemButtonProps): ReactNode {
  const translate = useTranslate();
  return (
    <IconButton
      label={translate("chelone.action.remove", { _: "Remove" })}
      icon={<X aria-hidden="true" className="size-4" />}
      data-slot="array-input-remove"
      {...props}
    />
  );
}

/**
 * The default move-up and move-down buttons. Reads the current row from the
 * ambient iterator, so it only works inside a {@link SimpleFormIterator} row.
 */
function ReOrderButtons({
  className,
  disabled,
}: ReOrderButtonsProps): ReactNode {
  const item = useIteratorItem();
  const translate = useTranslate();
  return (
    <div className={cn("flex items-center", className)}>
      <IconButton
        label={translate("chelone.action.move_up", { _: "Move up" })}
        icon={<ArrowUp aria-hidden="true" className="size-4" />}
        disabled={disabled || item.index === 0}
        onClick={() => item.reOrder(item.index - 1)}
      />
      <IconButton
        label={translate("chelone.action.move_down", { _: "Move down" })}
        icon={<ArrowDown aria-hidden="true" className="size-4" />}
        disabled={disabled || item.index >= item.total - 1}
        onClick={() => item.reOrder(item.index + 1)}
      />
    </div>
  );
}

interface SimpleFormIteratorProps {
  /** The inputs repeated in every row. */
  children?: ReactNode;
  /** Replaces the default Add button; it is cloned with the add `onClick`. */
  addButton?: ReactElement<IteratorButtonProps>;
  /** Replaces the default remove button; it is cloned with the remove `onClick`. */
  removeButton?: ReactElement<IteratorButtonProps>;
  /** Replaces the default reorder buttons; it reads the row via `useIteratorItem`. */
  reOrderButtons?: ReactElement;
  /** Extra classes on the iterator root. */
  className?: string;
  /** Hides every control (add, clear, remove, reorder). */
  disabled?: boolean;
  /** Hides the Add button. */
  disableAdd?: boolean;
  /** Hides the clear button. */
  disableClear?: boolean;
  /**
   * Hides the remove button, and the clear button with it. A function decides
   * per row index.
   */
  disableRemove?: boolean | ((index: number) => boolean);
  /** Hides the reorder buttons. */
  disableReordering?: boolean;
  /** Lays a row's inputs out in one line from the `sm` breakpoint up. */
  inline?: boolean;
  /**
   * A label per row. `true` numbers the rows from 1; a function returns the
   * label for a row index; `false` renders none.
   */
  getItemLabel?: boolean | ((index: number) => ReactNode);
}

function SimpleFormIteratorItem({
  children,
  removeButton,
  reOrderButtons,
  disabled,
  disableRemove,
  disableReordering,
  inline,
  getItemLabel,
}: Pick<
  SimpleFormIteratorProps,
  | "children"
  | "removeButton"
  | "reOrderButtons"
  | "disabled"
  | "disableRemove"
  | "disableReordering"
  | "inline"
  | "getItemLabel"
>) {
  const item = useIteratorItem();
  const removable =
    typeof disableRemove === "function"
      ? !disableRemove(item.index)
      : !disableRemove;
  const label =
    typeof getItemLabel === "function"
      ? getItemLabel(item.index)
      : getItemLabel === true
        ? item.index + 1
        : null;

  return (
    <li
      data-slot="simple-form-iterator-item"
      className="flex items-start gap-2 border-b pb-2 last:border-b-0"
    >
      {label != null && (
        <span
          data-slot="simple-form-iterator-item-label"
          className="min-w-6 pt-2 text-muted-foreground text-sm"
        >
          {label}
        </span>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col gap-2",
          inline &&
            "sm:flex-row sm:items-start sm:[&>*]:min-w-0 sm:[&>*]:flex-1",
        )}
      >
        {children}
      </div>
      {!disabled && (
        <div className="flex shrink-0 items-center gap-1 pt-1">
          {!disableReordering && (reOrderButtons ?? <ReOrderButtons />)}
          {removable &&
            (removeButton ? (
              cloneElement(removeButton, { onClick: () => item.remove() })
            ) : (
              <RemoveItemButton onClick={() => item.remove()} />
            ))}
        </div>
      )}
    </li>
  );
}

/**
 * The ready-made row UI for an `<ArrayInput>`: one list item per row with its
 * inputs, reorder and remove buttons, an Add button and a confirmed clear. Each
 * row scopes its inputs under `${source}[${index}]`. `<ArrayInput>` skips its
 * own Add button when this is its direct child.
 *
 * @example
 * <ArrayInput source="items">
 *   <SimpleFormIterator inline getItemLabel>
 *     <TextInput source="sku" />
 *     <NumberInput source="qty" />
 *   </SimpleFormIterator>
 * </ArrayInput>
 */
function SimpleFormIterator(props: SimpleFormIteratorProps): ReactNode {
  const {
    children,
    addButton,
    removeButton,
    reOrderButtons,
    className,
    disabled,
    disableAdd,
    disableClear,
    disableRemove,
    disableReordering,
    inline,
    getItemLabel,
  } = props;
  const { rows, add, clear, total } = useArrayInputResult();
  const translate = useTranslate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showClear = !disabled && total > 0 && !disableClear && !disableRemove;

  return (
    <div
      data-slot="simple-form-iterator"
      className={cn("flex flex-col gap-2", className)}
    >
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <IteratorRowProvider key={row.id} row={row}>
            <SimpleFormIteratorItem
              removeButton={removeButton}
              reOrderButtons={reOrderButtons}
              disabled={disabled}
              disableRemove={disableRemove}
              disableReordering={disableReordering}
              inline={inline}
              getItemLabel={getItemLabel}
            >
              {children}
            </SimpleFormIteratorItem>
          </IteratorRowProvider>
        ))}
      </ul>
      {!disabled && (!disableAdd || showClear) && (
        <div className="flex items-center gap-2">
          {!disableAdd &&
            (addButton ? (
              cloneElement(addButton, { onClick: () => add() })
            ) : (
              <AddItemButton onClick={() => add()} />
            ))}
          {showClear && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                data-slot="array-input-clear"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                {translate("chelone.action.clear_array_input", {
                  _: "Clear the array",
                })}
              </Button>
              <Confirm
                isOpen={confirmOpen}
                title={translate("chelone.action.clear_array_input", {
                  _: "Clear the array",
                })}
                content={translate("chelone.message.clear_array_input", {
                  _: "Are you sure you want to clear the whole array?",
                })}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => {
                  clear();
                  setConfirmOpen(false);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Tells `<ArrayInput>` this iterator renders its own Add button. */
SimpleFormIterator.ownsAddButton = true;

export {
  AddItemButton,
  type AddItemButtonProps,
  RemoveItemButton,
  type RemoveItemButtonProps,
  ReOrderButtons,
  type ReOrderButtonsProps,
  SimpleFormIterator,
  type SimpleFormIteratorProps,
};
