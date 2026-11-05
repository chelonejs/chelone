import { X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWatch } from "../../../form/rhf-shim";
import { useCheloneFormContext, useWrappedSource } from "../../../form-context";
import { useTranslate } from "../../../i18n-hooks";
import { TextInput, type TextInputProps } from "./text-input";

type ResettableTextInputProps = TextInputProps & {
  /**
   * If true (the default), a clear button is shown next to the input when it
   * has a value.
   */
  resettable?: boolean;
  /**
   * If true, the clear button is always visible, even when the input is empty
   * (and disabled).
   */
  clearAlwaysVisible?: boolean;
};

/**
 * Text input with a clear (×) button that resets the field value.
 *
 * Wraps `<TextInput>` and adds a small ghost button absolutely positioned on
 * the right side of the input. The button appears only when the field has a
 * value (unless `clearAlwaysVisible` is set). Clicking it sets the value back
 * to an empty string.
 *
 * Rebridge note: shadmin read `useFormContext().setValue` + `useWatch` (RHF);
 * chelone reads the live value through the `useWatch` shim and clears via
 * `form.setFieldValue(source, "")` off `useCheloneFormContext`. Both resolve
 * `source` through the ambient `SourceContext` so iterator rows compose the
 * absolute path identically.
 *
 * @example
 * import { Edit, ResettableTextInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <ResettableTextInput source="title" />
 *   </Edit>
 * );
 */
function ResettableTextInput(props: ResettableTextInputProps) {
  const {
    resettable = true,
    clearAlwaysVisible = false,
    className,
    inputClassName,
    source,
    disabled,
    readOnly,
    ...rest
  } = props;

  const translate = useTranslate();
  const { ambient } = useCheloneFormContext().form;
  const wrappedSource = useWrappedSource(source);
  const fieldValue = useWatch({ name: source });
  const hasValue = fieldValue != null && fieldValue !== "";
  const hasLabel = rest.label !== false;

  const handleClear = useCallback(() => {
    ambient.setFieldValue(wrappedSource, "");
  }, [ambient, wrappedSource]);

  const showClearButton = resettable && (clearAlwaysVisible || hasValue);
  const clearLabel = translate("ra.action.clear_input_value", {
    _: "Clear value",
  });

  return (
    <div className={cn("relative", className)}>
      <TextInput
        {...rest}
        source={source}
        disabled={disabled}
        readOnly={readOnly}
        inputClassName={cn(resettable ? "pr-9" : undefined, inputClassName)}
      />
      {showClearButton ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-1 size-7 text-muted-foreground",
            hasLabel ? "top-6" : "top-1",
          )}
          onClick={handleClear}
          disabled={disabled || readOnly || !hasValue}
          aria-label={clearLabel}
          title={clearLabel}
          tabIndex={-1}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

export { ResettableTextInput, type ResettableTextInputProps };
