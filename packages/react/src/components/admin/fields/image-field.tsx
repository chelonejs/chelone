import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import type { UnknownRecord, UnknownValue } from "@/lib/unknown-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

/**
 * Read a value at a dot path off `record`. Clean-room stand-in for
 * `lodash/get(record, path)` (chelone stays zero-lodash) — used only for the
 * per-item title/src lookups in the array branch.
 */
function getPath(record: unknown, path: string): unknown {
  if (record != null && typeof record === "object" && path in record) {
    return (record as Record<string, unknown>)[path];
  }
  let current: unknown = record;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

interface ImageFieldProps<RecordType extends UnknownRecord = UnknownRecord>
  extends FieldProps<RecordType>,
    Omit<HTMLAttributes<HTMLSpanElement>, "defaultValue"> {
  defaultValue?: UnknownValue;
  /** The path to the image url on each item, for an array of images. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
}

/**
 * Displays an image (or a `<ul>` of images) from a record field.
 *
 * Rebridge note (chelone): imports moved from `shadmin-core` to
 * `@chelone/react`; `lodash/get` replaced by a local zero-dep `getPath`. The
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
function ImageField<RecordType extends UnknownRecord = UnknownRecord>(
  props: ImageFieldProps<RecordType>,
) {
  const { src, defaultValue, source, record, empty, title, ...rest } = props;
  const value = useFieldValue({ defaultValue, source, record });
  const titleFromRecord = useFieldValue({
    record,
    // A `title` may be a record path OR a literal label. The hook must always be
    // called (rules of hooks), so pass `""` when `title` is absent — but chelone
    // reads `source:""` as the WHOLE record, so we discard that read below.
    source: title ?? "",
  });
  // Only derive a title when `title` is set: a real path resolves via the read,
  // a literal-but-missing path falls back to the literal, and no `title` prop
  // yields `undefined` (never the whole-record `"[object Object]"` leak).
  const titleValue = title ? (titleFromRecord?.toString() ?? title) : undefined;
  const translate = useTranslate();

  if (value == null) {
    if (!empty) {
      return null;
    }
    return (
      <span
        {...sanitizeFieldRestProps(rest as Record<string, unknown>)}
        className={cn("image-empty", rest.className)}
      >
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <span
        {...sanitizeFieldRestProps(rest as Record<string, unknown>)}
        className={cn("image-list", rest.className)}
      >
        <ul>
          {value.map((file, index) => {
            const fileTitleValue = title
              ? ((getPath(file, title) ?? title) as string)
              : title;
            const srcValue = src
              ? ((getPath(file, src) ?? title) as string)
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
      {...sanitizeFieldRestProps(rest as Record<string, unknown>)}
      className={cn("image-single", rest.className)}
    >
      <img
        title={titleValue}
        alt={titleValue}
        src={(value as UnknownValue)?.toString()}
      />
    </span>
  );
}

// TypeScript loses the displayName without an explicit assignment.
ImageField.displayName = "ImageField";

export { ImageField, type ImageFieldProps };
