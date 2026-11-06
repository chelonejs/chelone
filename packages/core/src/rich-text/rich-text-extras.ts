import {
  isSafeImageSrc,
  type RichTextToolbarGroup,
  richTextSanitizeOptions,
} from "./rich-text";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
const CONTROL = /[\u0000-\u001f\u007f]/g;

export interface RichTextImageRules {
  /** Exact types, or `type/*` for any subtype. SVG never passes. */
  allowedMimeTypes: readonly string[];
  /** Bytes. */
  maxFileSize: number;
  allowBase64: boolean;
}

/** shadmin's image settings: any image, 5 MB, base64 allowed. */
export const defaultRichTextImageRules: Readonly<RichTextImageRules> =
  Object.freeze({
    allowedMimeTypes: Object.freeze(["image/*"]),
    maxFileSize: 5 * 1024 * 1024,
    allowBase64: true,
  });

/** The `type/subtype` of a MIME type, lowercased, without parameters such as `;charset=utf-8`. */
function baseMimeType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? "").trim().toLowerCase();
}

function mimeMatches(pattern: string, type: string): boolean {
  const wanted = pattern.toLowerCase();
  if (wanted.endsWith("/*")) return type.startsWith(wanted.slice(0, -1));
  return type === wanted;
}

/** Why an image file is refused, or `null` when it is accepted. */
export function checkRichTextImageFile(
  file: { type: string; size: number },
  rules: RichTextImageRules,
): "type" | "size" | null {
  const type = baseMimeType(file.type);
  if (type === "image/svg+xml") return "type";
  if (!rules.allowedMimeTypes.some((pattern) => mimeMatches(pattern, type))) {
    return "type";
  }
  return file.size > rules.maxFileSize ? "size" : null;
}

export interface RichTextUpload {
  id: string | null;
  src: string;
}

/** What an upload handler may return: a URL, or a URL with the stored file's id. */
export function normalizeRichTextUpload(
  result: string | { id: string | number; src: string },
  rules: Pick<RichTextImageRules, "allowBase64"> = defaultRichTextImageRules,
): RichTextUpload | null {
  const upload =
    typeof result === "string"
      ? { id: null, src: result }
      : { id: String(result.id), src: result.src };
  return isSafeImageSrc(upload.src, { allowDataImages: rules.allowBase64 })
    ? upload
    : null;
}

/** `width` rounded and held in `min`..`max`. `max` wins when it is below `min`. */
export function clampRichTextImageWidth(
  width: number,
  { min, max }: { min: number; max: number },
): number {
  const rounded = Number.isNaN(width) ? min : Math.round(width);
  return Math.min(max, Math.max(min, rounded));
}

const EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ["jpeg", "jpg"],
  ["svg+xml", "svg"],
  ["x-icon", "ico"],
  ["vnd.microsoft.icon", "ico"],
]);

/** `<name>.<extension>` for downloading an image, from its alt text and mime type. */
export function richTextImageFileName(alt: string, mimeType: string): string {
  const name = alt
    .replace(CONTROL, "")
    .replace(/[/\\]/g, "")
    .trim()
    .replace(/^\.+/, "")
    .trim();
  const subtype = baseMimeType(mimeType).split("/")[1] ?? "";
  const extension =
    EXTENSIONS.get(subtype) || subtype.replace(/[^a-z0-9]/g, "") || "png";
  return `${name || "image"}.${extension}`;
}

export type RichTextImageActionId =
  | "view"
  | "download"
  | "copyImage"
  | "copyLink"
  | "remove";

export interface RichTextImageAction {
  id: RichTextImageActionId;
  /** Translation key, always `chelone.rich_text.image.<id>`. */
  labelKey: `chelone.rich_text.image.${RichTextImageActionId}`;
  defaultLabel: string;
}

function imageAction(
  id: RichTextImageActionId,
  defaultLabel: string,
): Readonly<RichTextImageAction> {
  return Object.freeze({
    id,
    labelKey: `chelone.rich_text.image.${id}`,
    defaultLabel,
  });
}

/** The image popover's actions, in display order. */
export const richTextImageActions: readonly Readonly<RichTextImageAction>[] =
  Object.freeze([
    imageAction("view", "View image"),
    imageAction("download", "Download image"),
    imageAction("copyImage", "Copy image"),
    imageAction("copyLink", "Copy link"),
    imageAction("remove", "Remove image"),
  ]);

export type RichTextColorPalette = "default" | "bright" | "soft" | "muted";

export interface RichTextColor {
  id: string;
  palette: RichTextColorPalette;
  /** Translation key, always `chelone.rich_text.color.<id>`. */
  labelKey: `chelone.rich_text.color.${string}`;
  defaultLabel: string;
  /** A `var(--rich-text-color-<id>)` reference, or `null` for the entry that clears the color. */
  value: `var(--rich-text-color-${string})` | null;
}

const COLOR_NAMES = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

function color(
  id: string,
  palette: RichTextColorPalette,
  defaultLabel: string,
  value: RichTextColor["value"],
): Readonly<RichTextColor> {
  return Object.freeze({
    id,
    palette,
    labelKey: `chelone.rich_text.color.${id}`,
    defaultLabel,
    value,
  });
}

function palette(
  name: Exclude<RichTextColorPalette, "default">,
  label: string,
): Readonly<RichTextColor>[] {
  return COLOR_NAMES.map((base) => {
    const id = `${name}-${base}`;
    return color(id, name, `${label} ${base}`, `var(--rich-text-color-${id})`);
  });
}

/**
 * The color picker's entries: `default` (clears the color), then three
 * palettes of seven. The adapter's stylesheet defines each
 * `--rich-text-color-<id>`.
 */
export const richTextColors: readonly Readonly<RichTextColor>[] = Object.freeze(
  [
    color("default", "default", "Default", null),
    ...palette("bright", "Bright"),
    ...palette("soft", "Soft"),
    ...palette("muted", "Muted"),
  ],
);

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)%?`;
const SEPARATOR = String.raw`(?:\s*[,/]\s*|\s+)`;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR = new RegExp(
  String.raw`^(?:rgba?|hsla?)\(\s*${NUMBER}(?:${SEPARATOR}${NUMBER}){2,3}\s*\)$`,
  "i",
);
const PALETTE_VALUES: ReadonlySet<string> = new Set(
  richTextColors.flatMap((entry) => (entry.value ? [entry.value] : [])),
);

function isSafeColorValue(value: string): boolean {
  return (
    PALETTE_VALUES.has(value) ||
    HEX_COLOR.test(value) ||
    FUNCTION_COLOR.test(value)
  );
}

/**
 * `color: <value>` when `style` is one `color` declaration with a palette
 * `var(...)`, hex, `rgb()`, `rgba()`, `hsl()` or `hsla()` value, else `null`.
 * Everything else a style attribute can carry is dropped.
 */
export function sanitizeRichTextStyle(style: string): string | null {
  const declarations = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration !== "");
  const [declaration, ...rest] = declarations;
  if (declaration === undefined || rest.length > 0) return null;
  const colon = declaration.indexOf(":");
  if (colon === -1) return null;
  if (declaration.slice(0, colon).trim().toLowerCase() !== "color") return null;
  const value = declaration.slice(colon + 1).trim();
  return isSafeColorValue(value) ? `color: ${value}` : null;
}

/**
 * `richTextSanitizeOptions` with `style` allowed through, for adapters that
 * run `sanitizeRichTextStyle` on every `style` attribute.
 */
export const richTextStyledSanitizeOptions = Object.freeze({
  FORBID_TAGS: richTextSanitizeOptions.FORBID_TAGS,
  FORBID_ATTR: Object.freeze<readonly string[]>(
    richTextSanitizeOptions.FORBID_ATTR.filter(
      (attribute) => attribute !== "style",
    ),
  ),
});

/** Options for tiptap's `CodeBlockLowlight.configure`, as shadmin sets them. */
export const richTextCodeBlockOptions = Object.freeze({
  languageClassPrefix: "language-",
  defaultLanguage: null,
  exitOnTripleEnter: true,
  exitOnArrowDown: true,
  enableTabIndentation: false,
  tabSize: 4,
});

export type RichTextExtraToolbarItemId = "image" | "color";

export interface RichTextExtraToolbarItem {
  id: RichTextExtraToolbarItemId;
  group: RichTextToolbarGroup;
  /** Translation key, always `chelone.rich_text.<id>`. */
  labelKey: `chelone.rich_text.${RichTextExtraToolbarItemId}`;
  defaultLabel: string;
  /** A binding in the syntax of `matchesHotkey`, e.g. `"mod+b"`. */
  shortcut?: string;
}

function extraItem(
  id: RichTextExtraToolbarItemId,
  group: RichTextToolbarGroup,
  defaultLabel: string,
): Readonly<RichTextExtraToolbarItem> {
  return Object.freeze({
    id,
    group,
    labelKey: `chelone.rich_text.${id}`,
    defaultLabel,
  });
}

/** The toolbar buttons an image or color extension adds, shaped like `richTextToolbarItems`. */
export const richTextExtraToolbarItems: readonly Readonly<RichTextExtraToolbarItem>[] =
  Object.freeze([
    extraItem("image", "insert", "Image"),
    extraItem("color", "mark", "Text color"),
  ]);
