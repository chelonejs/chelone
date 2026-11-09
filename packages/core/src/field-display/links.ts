/**
 * The `href` and `src` the url, file and image fields render. Each takes the
 * raw record value and returns only what is safe to put in an attribute, so a
 * stored `javascript:` url never reaches a live link or `src`. They call no
 * hooks, so a server component can use them as well as the React and Vue
 * fields.
 */
import { getAtPath } from "../resource/get-at-path";
import {
  isSafeFileUrl,
  isSafeImageSrc,
  isSafeLinkUrl,
} from "../rich-text/rich-text";

const HAS_SCHEME_OR_ROOT = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;

/**
 * `value` when a url field may render it as a link, else `undefined`. A scheme
 * must pass `isSafeLinkUrl`; a value with no scheme must start with `/` or
 * `#`, so `example.com` shows as text.
 */
export function urlFieldHref(value: string): string | undefined {
  const trimmed = value.trim();
  if (!isSafeLinkUrl(trimmed)) return undefined;
  return HAS_SCHEME_OR_ROOT.test(trimmed) ? value : undefined;
}

interface LinkFieldOptions {
  /** The path to the url on each item, for an array. */
  src?: string;
  /** The path to the display title, or a literal label. */
  title?: string;
}

interface RawItem {
  src: string | undefined;
  title: string | undefined;
}

function safeSrc(
  value: unknown,
  isSafe: (src: string) => boolean,
): string | undefined {
  if (value == null) return undefined;
  const text = String(value);
  return isSafe(text) ? text : undefined;
}

/** Each item's `src` stays only when `isSafe` passes it. */
function rawItems(
  value: unknown,
  record: unknown,
  { src, title }: LinkFieldOptions,
  isSafe: (src: string) => boolean,
): RawItem[] | null {
  if (value == null || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  if (Array.isArray(value)) {
    const items: RawItem[] = [];
    for (const item of value) {
      const itemTitle = title ? String(getAtPath(item, title) ?? title) : title;
      // `src` falls back to `title`, which may be absent: a miss stays
      // `undefined`, never the text "undefined".
      const itemSrc = src ? (getAtPath(item, src) ?? title) : title;
      items.push({ src: safeSrc(itemSrc, isSafe), title: itemTitle });
    }
    return items;
  }
  // A single value takes its title off the record, with the literal as the
  // fallback. No `title` yields `undefined`, never the whole record's text.
  const fromRecord = title ? getAtPath(record, title) : undefined;
  return [
    {
      src: safeSrc(value, isSafe),
      title: title
        ? fromRecord == null
          ? title
          : String(fromRecord)
        : undefined,
    },
  ];
}

export interface FileFieldLink {
  /** Set only when `isSafeFileUrl` passes. */
  href: string | undefined;
  title: string | undefined;
}

/**
 * The links a file field renders for a single file or an array: `null` for a
 * nullish value or an empty array. An unsafe url keeps its link with no `href`.
 */
export function fileFieldLinks(
  value: unknown,
  record: unknown,
  options: LinkFieldOptions,
): FileFieldLink[] | null {
  const items = rawItems(value, record, options, isSafeFileUrl);
  if (items === null) return null;
  return items.map(({ src, title }) => ({ href: src, title }));
}

export interface ImageFieldSource {
  /** Set only when `isSafeImageSrc` passes, raster `data:image` included. */
  src: string | undefined;
  title: string | undefined;
}

/**
 * The images an image field renders for a single image or an array: `null` for
 * a nullish value or an empty array. An unsafe `src` keeps its image with no
 * `src`.
 */
export function imageFieldSources(
  value: unknown,
  record: unknown,
  options: LinkFieldOptions,
): ImageFieldSource[] | null {
  return rawItems(value, record, options, (src) =>
    isSafeImageSrc(src, { allowDataImages: true }),
  );
}
