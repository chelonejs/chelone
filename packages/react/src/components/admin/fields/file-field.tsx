import {
  type FileFieldLink,
  fileFieldLinks,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { ElementFieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface FileFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ElementFieldProps<RecordType, HTMLAttributes<HTMLElement>> {
  /** The path to the file url on each item, for an array of files. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
  target?: HTMLAnchorElement["target"];
  download?: HTMLAnchorElement["download"];
  ping?: string;
  rel?: string;
}

/**
 * Displays a downloadable file link with a customizable title and target.
 *
 * Renders file urls as clickable links that can open in a new tab or trigger a
 * download. Supports arrays of files and stops click bubbling inside a
 * `DataTable` row. To be used with `RecordField` or `DataTable.Col`, or anywhere
 * a `RecordContext` is available. A url `isSafeFileUrl` rejects keeps its anchor
 * with no `href`, so a stored `javascript:` url cannot run on click.
 *
 * Rebridge note (chelone): imports moved from `shadmin-core` to
 * `@chelone/react` (`useFieldValue`/`useTranslate`/`sanitizeFieldRestProps`);
 * `lodash/get` replaced by core's `getAtPath`. Behavior is unchanged.
 *
 * @example
 * import { FileField } from '@/components/admin';
 *
 * // record { id: 123, url: 'doc.pdf', title: 'Presentation' } renders
 * // <div><a href="doc.pdf" title="Presentation">Presentation</a></div>
 * <FileField source="url" title="title" />
 */
function FileField<RecordType extends ResourceRecord = LooseRecord>(
  props: FileFieldProps<RecordType>,
) {
  const {
    className,
    empty,
    title,
    src,
    target,
    download,
    ping,
    rel,
    defaultValue,
    source,
    record,
    ...rest
  } = props;
  const sourceValue = useFieldValue({
    defaultValue,
    source,
    record,
  });
  // A `title` may be a record path OR a literal label, so core reads it with
  // `getAtPath` off the record rather than `useFieldValue`: that hook wants a
  // `SourceProp<RecordType>`, and a literal label is no record's path.
  const ctxRecord = useRecordContext<RecordType>({ record });
  const links = fileFieldLinks(sourceValue, ctxRecord, { src, title });
  const translate = useTranslate();

  if (links === null) {
    if (!empty) {
      return null;
    }

    return (
      <div
        className={cn("inline-block", className)}
        {...sanitizeFieldRestProps(rest)}
      >
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </div>
    );
  }

  const anchorFor = ({ href, title: linkTitle }: FileFieldLink) => (
    <a
      href={href}
      title={linkTitle}
      target={target}
      download={download}
      ping={ping}
      rel={rel}
      // stop bubbling so a DataTable rowClick doesn't fire.
      onClick={(e) => e.stopPropagation()}
    >
      {linkTitle}
    </a>
  );

  if (Array.isArray(sourceValue)) {
    return (
      <ul
        className={cn("inline-block", className)}
        {...sanitizeFieldRestProps(rest)}
      >
        {links.map((link, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: an unsafe url is dropped, so it cannot key the row.
          <li key={index}>{anchorFor(link)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={cn("inline-block", className)}
      {...sanitizeFieldRestProps(rest)}
    >
      {links[0] && anchorFor(links[0])}
    </div>
  );
}

export { FileField, type FileFieldProps };
