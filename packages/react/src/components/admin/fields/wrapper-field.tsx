import type { LooseRecord } from "@chelone/core";
import type { ReactNode } from "react";
import type { FieldProps } from "@/lib/field-types";

/**
 * Wraps several fields, exposing layout-level props (like `label` and `source`)
 * to the parent component (e.g. `<SimpleShowLayout>`, `<DataTable>`).
 *
 * Useful when you need to render multiple fields together but still want the
 * parent to display a single label or sortable header.
 *
 * @example
 * import { Show, SimpleShowLayout, WrapperField, TextField } from '@/components/admin';
 *
 * const PostShow = () => (
 *   <Show>
 *     <SimpleShowLayout>
 *       <WrapperField label="Author" source="last_name">
 *         <TextField source="first_name" />{' '}
 *         <TextField source="last_name" />
 *       </WrapperField>
 *     </SimpleShowLayout>
 *   </Show>
 * );
 */
function WrapperField<RecordType extends LooseRecord = LooseRecord>({
  children,
}: WrapperFieldProps<RecordType>) {
  return <>{children}</>;
}

WrapperField.displayName = "WrapperField";

interface WrapperFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends Omit<FieldProps<RecordType>, "source"> {
  source?: FieldProps<RecordType>["source"];
  children: ReactNode;
}

export { WrapperField, type WrapperFieldProps };
