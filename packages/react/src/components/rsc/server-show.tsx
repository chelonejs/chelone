/**
 * `<Show>` for a React Server Component: the same shell as `ShowView`, with the
 * record and the i18n passed as props. A server component may call no hook, so
 * nothing here reads a context, fetches, or emits an interactive element — the
 * app fetches in its own server function and hands the record in.
 */

import {
  defaultRecordRepresentation,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ServerI18n } from "./read-field-value";

/** A string shown to a reader: `text` translated, with itself as the fallback. */
function serverText(text: string, i18n?: ServerI18n): string {
  return i18n ? i18n.translate(text, { _: text }) : text;
}

interface ServerShowProps<RecordType extends ResourceRecord = LooseRecord> {
  /** The record to show. Required: there is no record context to fall back on. */
  record: RecordType;
  /**
   * The heading, as a message key: translated through `i18n` when one is given,
   * printed as is otherwise. Defaults to `defaultRecordRepresentation(record)`.
   */
  title?: string;
  /** Translates `title`. */
  i18n?: ServerI18n;
  /** Markup beside the heading, rendered as given — where an app puts a client island. */
  actions?: ReactNode;
  /** The fields. Each takes `record` itself: there is no record context. */
  children: ReactNode;
  /** A class name to apply to the header. */
  className?: string;
}

/**
 * A read-only show page rendered on the server: a heading, optional actions,
 * then the children. Fetches nothing.
 *
 * @example
 * import { ServerRecordField, ServerShow, ServerTextField } from "@chelone/react/rsc";
 *
 * <ServerShow record={post} actions={<a href="/admin/posts/1">Edit</a>}>
 *   <ServerRecordField label="post.title">
 *     <ServerTextField record={post} source="title" />
 *   </ServerRecordField>
 * </ServerShow>
 */
function ServerShow<RecordType extends ResourceRecord = LooseRecord>({
  record,
  title,
  i18n,
  actions,
  children,
  className,
}: ServerShowProps<RecordType>) {
  const heading =
    title === undefined
      ? defaultRecordRepresentation(record)
      : serverText(title, i18n);

  return (
    <>
      <div
        className={cn(
          "flex justify-between items-start flex-wrap gap-2 my-2",
          className,
        )}
      >
        <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
        {actions}
      </div>
      <div data-slot="show" className="my-2 space-y-4">
        {children}
      </div>
    </>
  );
}

interface ServerRecordFieldProps {
  /**
   * The label, as a message key: translated through `i18n` when one is given,
   * printed as is otherwise.
   */
  label: string;
  /** Translates `label`. */
  i18n?: ServerI18n;
  /** `stacked` puts the label above the value, `inline` beside it. Default `stacked`. */
  variant?: "stacked" | "inline";
  /** The value, usually a server field over the same record. */
  children: ReactNode;
  /** A class name to apply to the field wrapper. */
  className?: string;
}

/**
 * A labeled field-value pair inside `<ServerShow>`, in the layout `RecordField`
 * uses. The value arrives as children: a server field takes its record as a
 * prop, so there is nothing to read from context.
 *
 * @example
 * <ServerRecordField label="post.views" variant="inline" i18n={i18n}>
 *   <ServerNumberField record={post} source="views" />
 * </ServerRecordField>
 */
function ServerRecordField({
  label,
  i18n,
  variant,
  children,
  className,
}: ServerRecordFieldProps) {
  return (
    <div
      className={cn(
        className,
        "flex",
        variant === "inline" ? "flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          variant === "inline" ? "block min-w-50" : "text-xs",
          "text-muted-foreground",
        )}
      >
        <span>{serverText(label, i18n)}</span>
      </div>
      <span className="flex-1">{children}</span>
    </div>
  );
}

export {
  ServerRecordField,
  type ServerRecordFieldProps,
  ServerShow,
  type ServerShowProps,
};
