/**
 * `<Confirm>` — a generic confirmation dialog for destructive actions.
 * Ported from shadmin `feedback/confirm.tsx`; the ONE seam (shadmin-core's
 * `useTranslate`) is rewired to `@chelone/react`. Used by `<DeleteButton>` to
 * gate a delete behind an explicit confirmation (chelone has no undoable
 * notification stack yet, so pessimistic-with-confirm is the default delete UX).
 *
 * Labels flow through `translate(key, { _: fallback })` — the core translate now
 * honours the `_` fallback, so an untranslated key (e.g. `chelone.action.confirm`)
 * still renders readable English.
 */

import { AlertCircle, CheckCircle } from "lucide-react";
import type * as React from "react";
import { type ComponentType, type MouseEventHandler, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DialogPrimitive } from "@/components/ui/primitives";
import { useTranslate } from "../../../i18n-hooks";

/**
 * Generic confirmation dialog component for destructive actions.
 *
 * Displays a dialog with customizable title, content, and action buttons.
 * Used internally for delete operations and other confirmations.
 * Supports custom icons, button labels, and loading states.
 *
 * @example
 * import { useState } from "react";
 * import { Confirm } from "@chelone/react";
 *
 * const DeleteThing = () => {
 *   const [isOpen, setIsOpen] = useState(false);
 *   return (
 *     <>
 *       <button type="button" onClick={() => setIsOpen(true)}>Delete</button>
 *       <Confirm
 *         isOpen={isOpen}
 *         title="Are you sure you want to delete this element?"
 *         content="This action cannot be undone."
 *         onConfirm={() => setIsOpen(false)}
 *         onClose={() => setIsOpen(false)}
 *       />
 *     </>
 *   );
 * };
 */
function Confirm(props: ConfirmProps) {
  const {
    className,
    isOpen = false,
    loading,
    title,
    content,
    cancel = "chelone.action.cancel",
    confirm = "chelone.action.confirm",
    confirmColor = "primary",
    ConfirmIcon = CheckCircle,
    CancelIcon = AlertCircle,
    onClose,
    onConfirm,
    translateOptions = {},
    titleTranslateOptions = translateOptions,
    contentTranslateOptions = translateOptions,
    // Dialog (Radix Root) pass-through props
    modal,
    defaultOpen,
    ...rest
  } = props;

  const translate = useTranslate();

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      onClose(e);
    },
    [onClose],
  );

  const handleConfirm = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onConfirm(e);
    },
    [onConfirm],
  );

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => handleClose()}
      modal={modal}
      defaultOpen={defaultOpen}
    >
      <DialogContent className={className} onClick={handleClick} {...rest}>
        <DialogHeader>
          <DialogTitle>
            {typeof title === "string"
              ? translate(title, { _: title, ...titleTranslateOptions })
              : title}
          </DialogTitle>
          {typeof content === "string" ? (
            <DialogDescription>
              {translate(content, {
                _: content,
                ...contentTranslateOptions,
              })}
            </DialogDescription>
          ) : (
            content
          )}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            disabled={loading}
            onClick={handleClose}
            className="gap-1"
          >
            <CancelIcon className="size-5" />
            {translate(cancel, { _: cancel })}
          </Button>
          <Button
            autoFocus
            disabled={loading}
            onClick={handleConfirm}
            className="gap-1"
            variant={confirmColor === "warning" ? "destructive" : "default"}
          >
            <ConfirmIcon className="size-5" />
            {translate(confirm, { _: confirm })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Props for `<Confirm>`.
 *
 * Extends `React.ComponentProps<typeof DialogPrimitive.Content>` so any
 * HTML attribute (e.g. `aria-*`, `data-*`) or Radix `DialogContent` prop
 * is forwarded to the underlying `<DialogContent>` element.
 * Radix `Dialog.Root`-level props (`modal`, `defaultOpen`, `onOpenChange`)
 * are also accepted and forwarded to the root `<Dialog>`.
 */
interface ConfirmProps
  extends Omit<
    React.ComponentProps<typeof DialogPrimitive.Content>,
    "title" | "content" | "onClose"
  > {
  cancel?: string;
  className?: string;
  confirm?: string;
  confirmColor?: "primary" | "warning";
  ConfirmIcon?: ComponentType<{ className?: string }>;
  CancelIcon?: ComponentType<{ className?: string }>;
  content?: React.ReactNode;
  isOpen?: boolean;
  loading?: boolean;
  onClose: (event?: React.MouseEvent) => void;
  onConfirm: MouseEventHandler;
  title: React.ReactNode;
  /**
   * @deprecated use `titleTranslateOptions` and `contentTranslateOptions` instead
   */
  translateOptions?: object;
  titleTranslateOptions?: object;
  contentTranslateOptions?: object;
  /** Forwarded to Radix `Dialog.Root` — sets modality. */
  modal?: React.ComponentProps<typeof DialogPrimitive.Root>["modal"];
  /** Forwarded to Radix `Dialog.Root` — uncontrolled initial open state. */
  defaultOpen?: React.ComponentProps<
    typeof DialogPrimitive.Root
  >["defaultOpen"];
}

export { Confirm, type ConfirmProps };
