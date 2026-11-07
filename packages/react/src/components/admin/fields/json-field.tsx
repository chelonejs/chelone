import {
  formatJsonValue,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type { HTMLAttributes, ReactNode } from "react";
import type { ElementFieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface JsonFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ElementFieldProps<RecordType, HTMLAttributes<HTMLPreElement>> {
  /** Spaces per indentation level. Defaults to 2. */
  indent?: number;
  /** Shown in a span when the value is null or undefined. A string is translated. */
  empty?: ReactNode;
}

/**
 * Displays a record's JSON value as formatted text inside a pre element.
 *
 * The value may be an object, an array or a JSON string. A string that does
 * not parse is shown verbatim.
 *
 * @example
 * import { Show, RecordField, JsonField } from '@/components/admin';
 *
 * export const EventShow = () => (
 *   <Show>
 *     <RecordField source="payload">
 *       <JsonField source="payload" indent={4} />
 *     </RecordField>
 *   </Show>
 * );
 */
function JsonField<RecordType extends ResourceRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  indent = 2,
  className,
  ...rest
}: JsonFieldProps<RecordType>) {
  const value = useFieldValue({
    source,
    record,
    defaultValue,
  });
  const translate = useTranslate();

  if (value == null) {
    if (!empty) {
      return null;
    }

    return (
      <span className={className} {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  return (
    <pre
      className={cn("font-mono text-sm whitespace-pre-wrap", className)}
      {...sanitizeFieldRestProps(rest)}
    >
      {formatJsonValue(value, indent)}
    </pre>
  );
}

export { JsonField, type JsonFieldProps };
