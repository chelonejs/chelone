import {
  type LooseRecord,
  type ResourceRecord,
  urlFieldHref,
} from "@chelone/core";
import type * as React from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { ElementFieldProps } from "@/lib/field-types";
import { genericMemo } from "@/lib/gen-memo";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

/**
 * Displays a URL as a clickable hyperlink.
 *
 * Click events are prevented from bubbling up, making it safe inside DataTable
 * rows with `rowClick`. Refuses to render an anchor for unsafe schemes (e.g.
 * `javascript:`), falling back to plain text.
 *
 * @example
 * import { List, DataTable, UrlField } from '@/components/admin';
 *
 * const WebsiteList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col source="website">
 *         <UrlField source="website" empty="No website available" />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
const UrlFieldImpl = <RecordType extends ResourceRecord = LooseRecord>(
  inProps: UrlFieldProps<RecordType>,
) => {
  const {
    empty,
    className,
    defaultValue,
    source,
    record,
    resource: _,
    target,
    rel,
    content,
    ...rest
  } = inProps;
  const translate = useTranslate();
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });

  if (value == null || value === "") {
    if (!empty) {
      return null;
    }

    return (
      <span className={className} {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const href = typeof value === "string" ? urlFieldHref(value) : undefined;
  if (href === undefined) {
    // Refuse to render a clickable anchor for potentially unsafe schemes
    // (e.g. `javascript:`), but still surface the value as plain text.
    return (
      <span className={className} {...sanitizeFieldRestProps(rest)}>
        {typeof value === "string" ? value : String(value)}
      </span>
    );
  }

  // When opening in a new tab, default to a secure rel value unless the caller
  // has explicitly provided their own.
  const safeRel =
    target === "_blank" && rel == null ? "noopener noreferrer" : rel;

  return (
    <a
      className={cn("underline hover:no-underline", className)}
      onClick={stopPropagation}
      {...sanitizeFieldRestProps(rest)}
      href={href}
      target={target}
      rel={safeRel}
    >
      {content ?? href}
    </a>
  );
};
UrlFieldImpl.displayName = "UrlFieldImpl";

const UrlField = genericMemo(UrlFieldImpl);

interface UrlFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ElementFieldProps<
    RecordType,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "content">
  > {
  /** Content to display as the link text. Defaults to the URL value. */
  content?: ReactNode;
}

export { UrlField, type UrlFieldProps };

// useful to prevent click bubbling in a DataTable with rowClick
const stopPropagation = (e: React.MouseEvent<HTMLAnchorElement>) =>
  e.stopPropagation();
