/**
 * Url, email, file and image fields for a React Server Component. Each renders
 * what its client twin renders, from a record and an i18n passed as props, and
 * puts a stored url into `href` or `src` only when core's check passes it.
 *
 * None takes `onClick`: the client twins stop click bubbling for a
 * `DataTable` row click, and a server list has no row click handler.
 */

import {
  emailFieldHref,
  type FileFieldLink,
  fileFieldLinks,
  imageFieldSources,
  type LooseRecord,
  type ResourceRecord,
  urlFieldHref,
} from "@chelone/core";
import type { HTMLAttributeAnchorTarget, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { readFieldValue, serverEmptyText } from "./read-field-value";
import { type ServerFieldProps, ServerFieldSpan } from "./server-scalar-fields";

const LINK_CLASS = "underline hover:no-underline";

/** `rel` as given, or `noopener noreferrer` for a new tab with none. */
function safeRel(
  target: HTMLAttributeAnchorTarget | undefined,
  rel: string | undefined,
): string | undefined {
  return target === "_blank" && rel == null ? "noopener noreferrer" : rel;
}

/**
 * Displays a URL as a link, in a React Server Component. A url core's
 * `urlFieldHref` refuses (`javascript:`, or a bare `example.com`) prints as
 * text, with no anchor.
 *
 * @example
 * import { ServerUrlField } from "@chelone/react/rsc";
 *
 * <ServerUrlField record={product} source="url" target="_blank" />
 */
function ServerUrlField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  target,
  rel,
  content,
  className,
  ...rest
}: ServerUrlFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  if (value == null || value === "") {
    return <ServerFieldSpan text={null} className={className} {...rest} />;
  }
  const href = typeof value === "string" ? urlFieldHref(value) : undefined;
  if (href === undefined) {
    return (
      <ServerFieldSpan text={String(value)} className={className} {...rest} />
    );
  }
  return (
    <a
      className={cn(LINK_CLASS, className)}
      href={href}
      target={target}
      rel={safeRel(target, rel)}
    >
      {content ?? href}
    </a>
  );
}

interface ServerUrlFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ServerFieldProps<RecordType> {
  /** Where the link opens. `_blank` with no `rel` gets `noopener noreferrer`. */
  target?: HTMLAttributeAnchorTarget;
  /** The link's `rel`. */
  rel?: string;
  /** Content to display as the link text. Defaults to the URL value. */
  content?: ReactNode;
  /** A class name to apply to the `<a>`, or to the `<span>` of a text value. */
  className?: string;
}

/**
 * Displays an email address as a `mailto:` link, in a React Server Component.
 * Any stored value stays behind `mailto:`, so a `javascript:` url is never a
 * live script.
 *
 * @example
 * import { ServerEmailField } from "@chelone/react/rsc";
 *
 * <ServerEmailField record={customer} source="email" />
 */
function ServerEmailField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  className,
  ...rest
}: ServerEmailFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  const href = emailFieldHref(value);
  if (href === null) {
    return <ServerFieldSpan text={null} className={className} {...rest} />;
  }
  return (
    <a className={cn(LINK_CLASS, className)} href={href}>
      {String(value)}
    </a>
  );
}

interface ServerEmailFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ServerFieldProps<RecordType> {
  /** A class name to apply to the `<a>`. */
  className?: string;
}

/**
 * Displays a file link, or a `<ul>` of them for an array, in a React Server
 * Component. A url core's `isSafeFileUrl` refuses keeps its anchor with no
 * `href`, so a stored `javascript:` url cannot run on click.
 *
 * @example
 * import { ServerFileField } from "@chelone/react/rsc";
 *
 * <ServerFileField record={product} source="spec_sheet" title="Spec sheet" />
 */
function ServerFileField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  empty,
  i18n,
  className,
  src,
  title,
  target,
  download,
  rel,
}: ServerFileFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  const links = fileFieldLinks(value, record, { src, title });
  const wrapperClass = cn("inline-block", className);

  if (links === null) {
    if (!empty) return null;
    return <div className={wrapperClass}>{serverEmptyText(empty, i18n)}</div>;
  }

  const anchorFor = ({ href, title: linkTitle }: FileFieldLink) => (
    <a
      href={href}
      title={linkTitle}
      target={target}
      download={download}
      rel={safeRel(target, rel)}
    >
      {linkTitle}
    </a>
  );

  if (Array.isArray(value)) {
    return (
      <ul className={wrapperClass}>
        {links.map((link, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: an unsafe url is dropped, so it cannot key the row.
          <li key={index}>{anchorFor(link)}</li>
        ))}
      </ul>
    );
  }

  return <div className={wrapperClass}>{links[0] && anchorFor(links[0])}</div>;
}

interface ServerFileFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ServerFieldProps<RecordType> {
  /** The path to the file url on each item, for an array of files. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
  /** Where the link opens. `_blank` with no `rel` gets `noopener noreferrer`. */
  target?: HTMLAttributeAnchorTarget;
  /** The file name the browser saves the file under. */
  download?: string;
  /** The link's `rel`. */
  rel?: string;
  /** A class name to apply to the `<div>`, or the `<ul>` of an array. */
  className?: string;
}

/**
 * Displays an image, or a `<ul>` of images for an array, in a React Server
 * Component. A `src` core's `isSafeImageSrc` refuses keeps its `<img>` with no
 * `src`; a raster `data:image` passes, an SVG one does not.
 *
 * @example
 * import { ServerImageField } from "@chelone/react/rsc";
 *
 * <ServerImageField record={product} source="image" title="name" />
 */
function ServerImageField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  empty,
  i18n,
  className,
  src,
  title,
}: ServerImageFieldProps<RecordType>): ReactElement | null {
  const value = readFieldValue(record, source, defaultValue);
  const images = imageFieldSources(value, record, { src, title });

  if (images === null) {
    if (!empty) return null;
    return (
      <span className={cn("image-empty", className)}>
        {serverEmptyText(empty, i18n)}
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <span className={cn("image-list", className)}>
        <ul>
          {images.map((image, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: an unsafe `src` is dropped, so it cannot key the row.
            <li key={index}>
              <img alt={image.title} title={image.title} src={image.src} />
            </li>
          ))}
        </ul>
      </span>
    );
  }

  const [image] = images;
  return (
    <span className={cn("image-single", className)}>
      <img title={image?.title} alt={image?.title} src={image?.src} />
    </span>
  );
}

interface ServerImageFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ServerFieldProps<RecordType> {
  /** The path to the image url on each item, for an array of images. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
}

export {
  ServerEmailField,
  type ServerEmailFieldProps,
  ServerFileField,
  type ServerFileFieldProps,
  ServerImageField,
  type ServerImageFieldProps,
  ServerUrlField,
  type ServerUrlFieldProps,
};
