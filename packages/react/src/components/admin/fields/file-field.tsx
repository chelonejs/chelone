import { getAtPath, type LooseRecord } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { ElementFieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface FileFieldProps<RecordType extends LooseRecord = LooseRecord>
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
 * a `RecordContext` is available.
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
function FileField<RecordType extends LooseRecord = LooseRecord>(
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
  // A `title` may be a record path OR a literal label, so it is read with
  // `getAtPath` off the record rather than `useFieldValue`: that hook wants a
  // `SourceProp<RecordType>`, and a literal label is no record's path.
  const ctxRecord = useRecordContext<RecordType>({ record });
  const titleFromRecord = title ? getAtPath(ctxRecord, title) : undefined;
  // Only derive a title when `title` is set: a real path resolves via the read,
  // a literal-but-missing path falls back to the literal, and no `title` prop
  // yields `undefined` (never the whole-record `"[object Object]"` leak).
  const titleValue = title
    ? titleFromRecord == null
      ? title
      : String(titleFromRecord)
    : undefined;
  const translate = useTranslate();

  if (
    sourceValue == null ||
    (Array.isArray(sourceValue) && sourceValue.length === 0)
  ) {
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

  if (Array.isArray(sourceValue)) {
    return (
      <ul
        className={cn("inline-block", className)}
        {...sanitizeFieldRestProps(rest)}
      >
        {sourceValue.map((file, index) => {
          const fileTitleValue = title
            ? String(getAtPath(file, title) ?? title)
            : title;
          const srcValue = src ? String(getAtPath(file, src) ?? title) : title;

          return (
            <li key={srcValue ?? index}>
              <a
                href={srcValue}
                title={fileTitleValue}
                target={target}
                download={download}
                ping={ping}
                rel={rel}
                // stop bubbling so a DataTable rowClick doesn't fire.
                onClick={(e) => e.stopPropagation()}
              >
                {fileTitleValue}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div
      className={cn("inline-block", className)}
      {...sanitizeFieldRestProps(rest)}
    >
      <a
        href={sourceValue?.toString()}
        title={titleValue}
        target={target}
        download={download}
        ping={ping}
        rel={rel}
        // stop bubbling so a DataTable rowClick doesn't fire.
        onClick={(e) => e.stopPropagation()}
      >
        {titleValue}
      </a>
    </div>
  );
}

export { FileField, type FileFieldProps };
