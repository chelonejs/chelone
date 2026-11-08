import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClearableFieldValue } from "../../../form";
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
 * Wraps `<TextInput>` and overlays a small ghost button on the input through its
 * `controlSuffix`, so the button is centred on the input with or without a label,
 * helper text or an error. The button appears only when the field has a value
 * (unless `clearAlwaysVisible` is set). Clicking it sets the value back to an
 * empty string.
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
  const { hasValue, clearFieldValue } = useClearableFieldValue(source);

  const showClearButton = resettable && (clearAlwaysVisible || hasValue);
  const clearLabel = translate("chelone.action.clear_input_value", {
    _: "Clear value",
  });

  return (
    <TextInput
      {...rest}
      source={source}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      inputClassName={cn(resettable ? "pr-9" : undefined, inputClassName)}
      controlSuffix={
        showClearButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
            onClick={clearFieldValue}
            disabled={disabled || readOnly || !hasValue}
            aria-label={clearLabel}
            title={clearLabel}
            tabIndex={-1}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null
      }
    />
  );
}

export { ResettableTextInput, type ResettableTextInputProps };
