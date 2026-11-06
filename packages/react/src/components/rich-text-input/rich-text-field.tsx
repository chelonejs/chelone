import type { LooseRecord } from "@chelone/core";
import {
  isSafeImageSrc,
  richTextStyledSanitizeOptions,
  sanitizeRichTextStyle,
} from "@chelone/core";
import DOMPurify from "dompurify";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../util/sanitize-field-rest-props";
import "./rich-text.css";

// DOMPurify's `Config` takes mutable arrays, and core's options are frozen.
const sanitizeConfig = {
  FORBID_TAGS: [...richTextStyledSanitizeOptions.FORBID_TAGS],
  FORBID_ATTR: [...richTextStyledSanitizeOptions.FORBID_ATTR],
};

let purify: ReturnType<typeof DOMPurify> | undefined;

/**
 * This field's own DOMPurify, so its image hook never runs for other callers of
 * the shared default instance. Made on first use, since `window` is absent on
 * the server.
 */
function sanitizer(): ReturnType<typeof DOMPurify> {
  if (purify) return purify;
  const created = DOMPurify(window);
  // `javascript:` is already gone; this also drops SVG data URLs, which DOMPurify allows on an `img`.
  created.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName !== "IMG" || !(node instanceof window.Element)) return;
    const src = node.getAttribute("src");
    if (src === null || !isSafeImageSrc(src, { allowDataImages: true }))
      node.remove();
  });
  // `style` is allowed through the options; only a palette or plain color survives.
  created.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;
    const style = sanitizeRichTextStyle(data.attrValue);
    if (style === null) data.keepAttr = false;
    else data.attrValue = style;
  });
  purify = created;
  return created;
}

interface RichTextFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Shows the text of the HTML, with no elements. */
  stripTags?: boolean;
}

/**
 * Shows a stored HTML value, sanitized with DOMPurify and the core
 * `richTextStyledSanitizeOptions`: scripts, event handlers, frames and form
 * controls are removed before the HTML reaches the DOM, and a `style` attribute
 * survives only as a palette, hex, `rgb()` or `hsl()` `color`. Code blocks show
 * without highlighting.
 *
 * Needs the optional `dompurify` peer. From npm, import
 * `@chelone/react/rich-text-input.css` once for the content styles; the
 * registry item ships that file with the component.
 *
 * @example
 * import { RichTextField } from "@chelone/react/rich-text-input";
 *
 * <RichTextField source="body" empty="No content" />
 */
function RichTextField<RecordType extends LooseRecord = LooseRecord>({
  source,
  record,
  empty,
  className,
  stripTags = false,
  ...rest
}: RichTextFieldProps<RecordType>) {
  const value = useFieldValue({ source, record });
  const translate = useTranslate();

  const html =
    value == null ? "" : typeof value === "string" ? value : String(value);

  const props = sanitizeFieldRestProps(rest);

  if (html === "") {
    if (!empty) {
      return (
        <div
          {...props}
          data-slot="rich-text-field"
          className={cn("rich-text", className)}
        />
      );
    }
    return (
      <>{typeof empty === "string" ? translate(empty, { _: empty }) : empty}</>
    );
  }

  const clean = sanitizer().sanitize(html, sanitizeConfig);

  if (stripTags) {
    const text = new DOMParser().parseFromString(clean, "text/html").body
      .textContent;
    return (
      <div
        {...props}
        data-slot="rich-text-field"
        className={cn("rich-text", className)}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      {...props}
      data-slot="rich-text-field"
      className={cn("rich-text", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: `clean` went through DOMPurify
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export { RichTextField, type RichTextFieldProps };
