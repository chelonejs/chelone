import {
  formatFieldText,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
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
function TextField<RecordType extends ResourceRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  ...rest
}: TextFieldProps<RecordType>) {
  const value = useFieldValue({ defaultValue, source, record });
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
    <span {...sanitizeFieldRestProps(rest)}>{formatFieldText(value)}</span>
  );
}

interface TextFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {}

export { TextField, type TextFieldProps };
