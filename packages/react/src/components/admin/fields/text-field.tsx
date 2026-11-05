import type { LooseRecord } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

/**
 * Displays a text value from a record field inside a span element.
 *
 * This is the default field component used in DataTable columns and RecordField
 * components.
 *
 * @example
 * import { List, DataTable, TextField } from '@/components/admin';
 *
 * export const UserList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="id" />
 *       <DataTable.Col>
 *         <TextField source="name" empty="resources.users.fields.name.empty" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
function TextField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  ...rest
}: TextFieldProps<RecordType>) {
  const value: unknown = useFieldValue<LooseRecord>({
    defaultValue,
    source,
    record,
  });
  const translate = useTranslate();

  if (value == null) {
    if (!empty) {
      return null;
    }

    return (
      <span {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  return (
    <span {...sanitizeFieldRestProps(rest)}>
      {typeof value !== "string" ? String(value) : value}
    </span>
  );
}

interface TextFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {}

export { TextField, type TextFieldProps };
