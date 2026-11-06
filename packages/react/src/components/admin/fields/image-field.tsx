import { getAtPath, type LooseRecord } from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface ImageFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  /** The path to the image url on each item, for an array of images. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
}

/**
 * Displays an image (or a `<ul>` of images) from a record field.
 *
 * Rebridge note (chelone): imports moved from `shadmin-core` to
 * `@chelone/react`; `lodash/get` replaced by core's `getAtPath`. The
 * rest props are always applied to an enclosing `<span>` so each case (empty,
 * single, list) can be styled. Behavior is unchanged.
 *
 * @example
 * import { ImageField } from '@/components/admin';
 *
 * <ImageField
 *   source="avatar_url"
 *   className="[&_img]:w-8 [&_img]:h-8 [&_img]:rounded-full"
 *   empty={<div className="size-8 rounded-full bg-muted">👤</div>}
 * />
 */
function ImageField<RecordType extends LooseRecord = LooseRecord>(
  props: ImageFieldProps<RecordType>,
) {
  const { src, defaultValue, source, record, empty, title, ...rest } = props;
  const value = useFieldValue({ defaultValue, source, record });
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

  if (value == null) {
    if (!empty) {
      return null;
    }
    return (
      <span
        {...sanitizeFieldRestProps(rest)}
        className={cn("image-empty", rest.className)}
      >
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <span
        {...sanitizeFieldRestProps(rest)}
        className={cn("image-list", rest.className)}
      >
        <ul>
          {value.map((file, index) => {
            const fileTitleValue = title
              ? String(getAtPath(file, title) ?? title)
              : title;
            const srcValue = src
              ? String(getAtPath(file, src) ?? title)
              : title;

            return (
              <li key={srcValue ?? index}>
                <img
                  alt={fileTitleValue}
                  title={fileTitleValue}
                  src={srcValue}
                />
              </li>
            );
          })}
        </ul>
      </span>
    );
  }

  return (
    <span
      {...sanitizeFieldRestProps(rest)}
      className={cn("image-single", rest.className)}
    >
      <img title={titleValue} alt={titleValue} src={value?.toString()} />
    </span>
  );
}

// TypeScript loses the displayName without an explicit assignment.
ImageField.displayName = "ImageField";

export { ImageField, type ImageFieldProps };
