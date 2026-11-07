import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";
import {
  createElement,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import type { FieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { TextField } from "./text-field";

interface RecordFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends Omit<FieldProps<RecordType>, "source" | "record">,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  children?: ReactNode;
  field?: ElementType;
  render?: (record: RecordType) => ReactNode;
  source?: SourceProp<RecordType>;
  record?: RecordType;
  variant?: "default" | "inline";
}

/**
 * Displays a labeled field-value pair with flexible rendering options.
 *
 * Supports vertical or inline layout. It renders children, a custom `field`
 * component, or a `<TextField>` by default. To be used with a `RecordContext`
 * (e.g. inside `<Show>`, or inside `<ArrayField>` to display array items).
 *
 * @example
 * import { NumberField, RecordField, Show } from '@/components/admin';
 *
 * const PostShow = () => (
 *   <Show>
 *     <RecordField source="reference" label="Ref." />
 *     <RecordField label="dimensions" render={r => `${r.width}x${r.height}`} />
 *     <RecordField source="price">
 *       <NumberField source="price" options={{ style: 'currency', currency: 'USD' }} />
 *     </RecordField>
 *     <RecordField source="status" variant="inline" />
 *   </Show>
 * );
 */
function RecordField<RecordType extends ResourceRecord = LooseRecord>(
  props: RecordFieldProps<RecordType>,
) {
  const {
    children,
    className,
    empty,
    field,
    label,
    render,
    resource: _,
    source,
    record: recordProp,
    variant,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  const record = useRecordContext<RecordType>({ record: recordProp });
  const translate = useTranslate();

  if (!source && !label && !render) return null;

  return (
    <div
      className={cn(
        className,
        "flex",
        variant === "inline" ? "flex-row" : "flex-col",
      )}
      {...rest}
    >
      {label !== "" && label !== false ? (
        <div
          className={cn(
            variant === "inline" ? "block min-w-50" : "text-xs",
            "text-muted-foreground",
          )}
        >
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={false}
          />
        </div>
      ) : null}
      {children ? (
        <span className="flex-1">{children}</span>
      ) : render ? (
        record && (
          <span className="flex-1">
            {render(record) ||
              (typeof empty === "string"
                ? translate(empty, { _: empty })
                : empty)}
          </span>
        )
      ) : field ? (
        createElement(field, {
          source,
          empty,
          className: "flex-1",
        })
      ) : source ? (
        <TextField source={source} empty={empty} className="flex-1" />
      ) : null}
    </div>
  );
}

export { RecordField, type RecordFieldProps };
