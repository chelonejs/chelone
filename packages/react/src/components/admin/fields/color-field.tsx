import type { LooseRecord } from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface ColorFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  /** When false, hides the textual color value next to the chip. */
  showLabel?: boolean;
}

/**
 * Displays a color value as a colored chip plus its string label.
 *
 * Accepts any CSS color string (hex, rgb, oklch). The chip's background is set
 * via the inline `style` attribute so the browser parses the value.
 *
 * @example
 * import { Show, RecordField, ColorField } from '@/components/admin';
 *
 * const BrandShow = () => (
 *   <Show>
 *     <RecordField source="color">
 *       <ColorField source="color" />
 *     </RecordField>
 *   </Show>
 * );
 */
function ColorField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  showLabel = true,
  className,
  ...rest
}: ColorFieldProps<RecordType>) {
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });
  const translate = useTranslate();

  if (value == null || value === "") {
    if (!empty) return null;
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const colorString = String(value);

  return (
    <span
      {...sanitizeFieldRestProps(rest)}
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
    >
      <span
        data-color-chip
        className="inline-block h-4 w-4 rounded border border-border"
        style={{ backgroundColor: colorString }}
        aria-hidden
      />
      {showLabel && <span className="font-mono text-sm">{colorString}</span>}
    </span>
  );
}

export { ColorField, type ColorFieldProps };
