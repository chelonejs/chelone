import type { LooseRecord, ResourceRecord } from "@chelone/core";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import type { ElementFieldProps } from "@/lib/field-types";
import { genericMemo } from "@/lib/gen-memo";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

type BadgeProps = ComponentProps<typeof Badge>;

function ChipFieldImpl<RecordType extends ResourceRecord = LooseRecord>(
  inProps: ChipFieldProps<RecordType>,
) {
  const {
    className,
    empty,
    defaultValue,
    source,
    record,
    variant = "outline",
    ...rest
  } = inProps;
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });
  const translate = useTranslate();

  if (value == null || value === "") {
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
    <Badge
      variant={variant}
      className={cn(className)}
      {...sanitizeFieldRestProps(rest)}
    >
      {typeof value !== "string" ? String(value) : value}
    </Badge>
  );
}
ChipFieldImpl.displayName = "ChipFieldImpl";

/**
 * Displays a value inside a styled badge, similar to a Material UI Chip.
 *
 * Useful for highlighting status values, tags, or categorical information. To
 * be used with `RecordField` or `DataTable.Col`, or anywhere a `RecordContext`
 * is available.
 *
 * @example
 * import { List, DataTable, ChipField } from '@/components/admin';
 *
 * const PostList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="title" />
 *       <DataTable.Col>
 *         <ChipField source="category" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
const ChipField = genericMemo(ChipFieldImpl);

interface ChipFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ElementFieldProps<RecordType, Omit<BadgeProps, "children">> {
  variant?: "default" | "outline" | "secondary" | "destructive";
}

export { ChipField, type ChipFieldProps };
