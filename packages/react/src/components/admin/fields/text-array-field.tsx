import type { LooseRecord } from "@chelone/core";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { FieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

type BadgeProps = ComponentProps<typeof Badge>;

/**
 * Renders an array of scalar values as a horizontal list of badges.
 *
 * Useful for displaying tags, genres, or any other array of short strings. To
 * be used with `RecordField` or `DataTable.Col`, or anywhere a `RecordContext`
 * is available.
 *
 * @example
 * // const post = { id: 123, genres: ['Fiction', 'Historical Fiction'] };
 * import { Show, RecordField, TextArrayField } from '@/components/admin';
 *
 * const PostShow = () => (
 *   <Show>
 *     <RecordField source="genres">
 *       <TextArrayField source="genres" />
 *     </RecordField>
 *   </Show>
 * );
 */
function TextArrayField<RecordType extends LooseRecord = LooseRecord>(
  props: TextArrayFieldProps<RecordType>,
) {
  const {
    className,
    defaultValue,
    source,
    record,
    empty,
    variant = "outline",
    ...rest
  } = props;
  const data: unknown = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  const isEmpty = !Array.isArray(data) || data.length === 0;

  if (isEmpty) {
    if (!empty) {
      return null;
    }
    return (
      <span className={cn("text-muted-foreground", className)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1", className)}
      {...sanitizeFieldRestProps(rest)}
    >
      {(data as ReactNode[]).map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: field value is an array of primitives that may contain duplicates (e.g. ["a","a"]); index disambiguates equal values
        <Badge key={`${String(item)}-${index}`} variant={variant}>
          {item != null && typeof item !== "string" ? String(item) : item}
        </Badge>
      ))}
    </div>
  );
}

interface TextArrayFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  variant?: BadgeProps["variant"];
}

export { TextArrayField, type TextArrayFieldProps };
