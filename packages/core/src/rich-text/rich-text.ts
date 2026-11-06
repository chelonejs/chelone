// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
const CONTROL = /[\u0000-\u001f\u007f]/g;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

const LINK_SCHEMES: ReadonlySet<string> = new Set([
  "http",
  "https",
  "mailto",
  "tel",
]);

/**
 * `url` as a browser reads its scheme. Browsers drop tabs and newlines anywhere in a URL and
 * ignore leading control characters and spaces, so `java\tscript:` is
 * `javascript:`. Every control character is dropped here, which can only make a
 * scheme easier to see.
 */
function normalize(url: string): string {
  return url.replace(CONTROL, "").trimStart();
}

function schemeOf(normalized: string): string | undefined {
  return SCHEME.exec(normalized)?.[1]?.toLowerCase();
}

/** Whether a link `href` is safe to store and render in rich text. */
export function isSafeLinkUrl(url: string): boolean {
  const scheme = schemeOf(normalize(url));
  return scheme === undefined || LINK_SCHEMES.has(scheme);
}

const FILE_SCHEMES: ReadonlySet<string> = new Set(["http", "https", "blob"]);

/**
 * Whether a file `href` is safe to render. `blob` is allowed on top of the link
 * schemes: `FileInput` previews a picked file with `URL.createObjectURL` and
 * hands that url to `FileField`.
 */
export function isSafeFileUrl(url: string): boolean {
  const scheme = schemeOf(normalize(url));
  return scheme === undefined || FILE_SCHEMES.has(scheme);
}

export interface IsSafeImageSrcOptions {
  /** Allow base64 raster `data:image/*` sources. SVG is never allowed. */
  allowDataImages?: boolean;
}

const IMAGE_SCHEMES: ReadonlySet<string> = new Set(["http", "https", "blob"]);
const RASTER_DATA_URL = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,/i;

/** Whether an image `src` is safe to store and render in rich text. */
export function isSafeImageSrc(
  src: string,
  options: IsSafeImageSrcOptions = {},
): boolean {
  const normalized = normalize(src);
  const scheme = schemeOf(normalized);
  if (scheme === undefined || IMAGE_SCHEMES.has(scheme)) return true;
  return options.allowDataImages === true && RASTER_DATA_URL.test(normalized);
}

/** DOMPurify config for stored rich text HTML. Spread it into `sanitize`. */
export const richTextSanitizeOptions = Object.freeze({
  FORBID_TAGS: Object.freeze([
    "style",
    "form",
    "input",
    "button",
    "textarea",
    "select",
    "iframe",
    "object",
    "embed",
  ] as const),
  FORBID_ATTR: Object.freeze(["style"] as const),
});

/**
 * Options for tiptap's `StarterKit.configure`. `isAllowedUri` ignores tiptap's
 * second argument, so the scheme rule is ours alone.
 */
export const richTextStarterKitOptions = Object.freeze({
  heading: Object.freeze({
    levels: Object.freeze([1, 2, 3, 4, 5, 6] as const),
  }),
  link: Object.freeze({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    isAllowedUri: (url: string): boolean => isSafeLinkUrl(url),
  }),
});

export type RichTextToolbarItemId =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "clearFormatting"
  | "link"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "undo"
  | "redo";

export type RichTextToolbarGroup =
  | "mark"
  | "insert"
  | "list"
  | "block"
  | "history";

export interface RichTextToolbarItem {
  id: RichTextToolbarItemId;
  group: RichTextToolbarGroup;
  /** Translation key, always `chelone.rich_text.<id>`. */
  labelKey: `chelone.rich_text.${RichTextToolbarItemId}`;
  defaultLabel: string;
  /** A binding in the syntax of `matchesHotkey`, e.g. `"mod+b"`. */
  shortcut?: string;
}

function item(
  id: RichTextToolbarItemId,
  group: RichTextToolbarGroup,
  defaultLabel: string,
  shortcut?: string,
): Readonly<RichTextToolbarItem> {
  return Object.freeze({
    id,
    group,
    labelKey: `chelone.rich_text.${id}`,
    defaultLabel,
    ...(shortcut ? { shortcut } : {}),
  });
}

/**
 * Every toolbar button, in display order. Adapters map each id to a tiptap
 * command, so core names no tiptap type. A shortcut is listed only where
 * tiptap's own keymap binds it, so the adapter wires nothing extra. Link has
 * none: tiptap binds no key for it, and `mod+k` opens the command menu.
 */
export const richTextToolbarItems: readonly Readonly<RichTextToolbarItem>[] =
  Object.freeze([
    item("bold", "mark", "Bold", "mod+b"),
    item("italic", "mark", "Italic", "mod+i"),
    item("underline", "mark", "Underline", "mod+u"),
    item("strike", "mark", "Strikethrough", "mod+shift+s"),
    item("code", "mark", "Code", "mod+e"),
    item("clearFormatting", "mark", "Clear formatting"),
    item("link", "insert", "Link"),
    item("bulletList", "list", "Bullet list", "mod+shift+8"),
    item("orderedList", "list", "Ordered list", "mod+shift+7"),
    item("blockquote", "block", "Blockquote", "mod+shift+b"),
    item("codeBlock", "block", "Code block", "mod+alt+c"),
    item("horizontalRule", "insert", "Horizontal rule"),
    item("undo", "history", "Undo", "mod+z"),
    item("redo", "history", "Redo", "mod+shift+z"),
  ]);

export type RichTextHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface RichTextBlockType {
  id: "paragraph" | `heading${RichTextHeadingLevel}`;
  /** Set on the heading types. */
  level?: RichTextHeadingLevel;
  labelKey: string;
  defaultLabel: string;
}

function heading(level: RichTextHeadingLevel): Readonly<RichTextBlockType> {
  return Object.freeze({
    id: `heading${level}`,
    level,
    labelKey: `chelone.rich_text.heading_${level}`,
    defaultLabel: `Heading ${level}`,
  });
}

/** What the block-type select offers: paragraph, then headings 1 to 6. */
export const richTextBlockTypes: readonly Readonly<RichTextBlockType>[] =
  Object.freeze([
    Object.freeze({
      id: "paragraph",
      labelKey: "chelone.rich_text.paragraph",
      defaultLabel: "Paragraph",
    } as const),
    heading(1),
    heading(2),
    heading(3),
    heading(4),
    heading(5),
    heading(6),
  ]);
