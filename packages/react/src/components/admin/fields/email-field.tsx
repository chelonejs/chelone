import {
  emailFieldHref,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type React from "react";
import type { AnchorHTMLAttributes } from "react";
import type { ElementFieldProps } from "@/lib/field-types";
import { genericMemo } from "@/lib/gen-memo";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

function EmailFieldImpl<RecordType extends ResourceRecord = LooseRecord>(
  inProps: EmailFieldProps<RecordType>,
) {
  const { className, empty, defaultValue, source, record, ...rest } = inProps;
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });
  const translate = useTranslate();

  const href = emailFieldHref(value);
  if (href === null) {
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
    <a
      className={cn("underline hover:no-underline", className)}
      href={href}
      onClick={stopPropagation}
      {...sanitizeFieldRestProps(rest)}
    >
      {typeof value === "string" ? value : String(value)}
    </a>
  );
}
EmailFieldImpl.displayName = "EmailFieldImpl";

/**
 * Displays an email address as a clickable `mailto:` link.
 *
 * Click events are prevented from bubbling up, making it safe inside DataTable
 * rows with `rowClick`. To be used with `RecordField` or `DataTable.Col`, or
 * anywhere a `RecordContext` is available.
 *
 * @example
 * import { List, DataTable, EmailField } from '@/components/admin';
 *
 * const UserList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="name" />
 *       <DataTable.Col source="email" field={EmailField} />
 *     </DataTable>
 *   </List>
 * );
 */
const EmailField = genericMemo(EmailFieldImpl);

interface EmailFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ElementFieldProps<
    RecordType,
    AnchorHTMLAttributes<HTMLAnchorElement>
  > {}

// useful to prevent click bubbling in a DataTable with rowClick
const stopPropagation = (e: React.MouseEvent<HTMLAnchorElement>) =>
  e.stopPropagation();

export { EmailField, type EmailFieldProps };
