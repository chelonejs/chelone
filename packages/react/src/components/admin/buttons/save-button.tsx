/**
 * `<SaveButton>` — submits the ambient CRUD form. Ported from shadmin
 * `buttons/save-button.tsx` and rebridged off React-Hook-Form onto chelone's
 * TanStack-form seams:
 *
 * - shadmin read `useFormContext()` + `useFormState()` (RHF) and relied on a
 *   native `<form>` submit event bubbling up. Chelone's `<Edit>`/`<Create>`
 *   render their children in a plain `<div>` (no `<form>` element), so a
 *   `type="submit"` button submits nothing. Instead this button reads the
 *   ambient `submit` off `useCheloneFormContext()` (the composed
 *   validate→persist→reconcile pipeline) and invokes it on click.
 * - Disabled state derives from the reactive form-store slices
 *   (`isSubmitting`/`isValidating`/`canSubmit`) plus `useSaveContext().saving`,
 *   not RHF's `useFormState`.
 * - The `type` prop is kept for API parity, but the default `"submit"` still
 *   fires `submit()` programmatically (the button is never inside a `<form>`).
 *
 * The label routes through `translate(key, { _: fallback })` so an untranslated
 * `chelone.action.save` still renders "Save".
 */

import { useSelector } from "@tanstack/react-store";
import { Save } from "lucide-react";
import type * as React from "react";
import { type MouseEventHandler, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCheloneFormContext } from "../../../form-context";
import { useTranslate } from "../../../i18n-hooks";
import { useSaveContext } from "../../../save-context";

const defaultIcon = <Save />;

interface Props {
  className?: string;
  /** Keep the button enabled even when the form is pristine/invalid. */
  alwaysEnable?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** i18n key (or literal) for the button label. Defaults to `chelone.action.save`. */
  label?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

type SaveButtonProps = Props & React.ComponentProps<"button">;

/**
 * A button that saves the ambient form with a loading state.
 *
 * Reads the composed `submit` off the ambient `<CheloneFormProvider>` (mounted
 * by `<Edit>`/`<Create>`) and fires it on click. Shows a spinner and disables
 * while the save is in flight; disables when the form cannot submit unless
 * `alwaysEnable` is set.
 *
 * @example
 * import { Edit, TextInput, SaveButton } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <TextInput source="title" />
 *     <SaveButton />
 *   </Edit>
 * );
 */
function SaveButton(props: SaveButtonProps) {
  const {
    className,
    icon = defaultIcon,
    label = "chelone.action.save",
    onClick,
    alwaysEnable = false,
    disabled: disabledProp,
    type = "submit",
    variant = "default",
    ref,
    ...rest
  } = props;
  const translate = useTranslate();
  const {
    form: { ambient },
    submit,
  } = useCheloneFormContext();
  const saveContext = useSaveContext();

  const isSubmitting = useSelector(ambient.store, (s) => s.isSubmitting);
  const isValidating = useSelector(ambient.store, (s) => s.isValidating);
  const canSubmit = useSelector(ambient.store, (s) => s.canSubmit);
  const saving = isSubmitting || saveContext.saving === true;

  const disabled = alwaysEnable
    ? disabledProp
    : disabledProp || isValidating || saving || !canSubmit;

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      if (onClick) {
        onClick(event);
      }
      if (event.defaultPrevented) {
        return;
      }
      // Chelone views render no `<form>` element, so a native submit never
      // fires — trigger the composed submit pipeline directly. Prefer the
      // ambient controller `submit`; fall back to the form's own handleSubmit.
      event.preventDefault();
      event.stopPropagation();
      if (submit) {
        await submit();
      } else {
        await ambient.handleSubmit();
      }
    },
    [onClick, submit, ambient],
  );

  const displayedLabel = label ? translate(label, { _: label }) : undefined;

  return (
    <Button
      ref={ref}
      variant={variant}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      aria-label={
        typeof displayedLabel === "string" ? displayedLabel : undefined
      }
      className={className}
      {...rest}
    >
      {saving ? <Spinner /> : icon}
      {displayedLabel}
    </Button>
  );
}

export { SaveButton, type SaveButtonProps };
