import type { LooseRecord } from "@chelone/core";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { FieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

type BadgeProps = React.ComponentProps<typeof Badge>;

/**
 * Displays a text value inside a styled badge.
 *
 * Wraps values in a `<Badge>` with customizable variants (default, outline,
 * secondary, destructive). Use it to highlight status values, tags, or
 * categorical information. To be used with `RecordField` or `DataTable.Col`, or
 * anywhere a `RecordContext` is available.
 *
 * @example
 * import { List, DataTable, BadgeField } from '@/components/admin';
 *
 * const OrderList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col>
 *         <BadgeField source="status" variant="outline" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
interface BadgeFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    BadgeProps {
  variant?: "default" | "outline" | "secondary" | "destructive";
}

function BadgeField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  variant = "outline",
  ...rest
}: BadgeFieldProps<RecordType>) {
  const value = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  if (value == null) {
    return empty && typeof empty === "string"
      ? translate(empty, { _: empty })
      : empty;
  }

  return (
    <Badge variant={variant} {...sanitizeFieldRestProps(rest)}>
      {typeof value !== "string" ? String(value) : value}
    </Badge>
  );
}

export { BadgeField, type BadgeFieldProps };
