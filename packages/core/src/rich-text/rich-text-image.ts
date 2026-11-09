import { isSafeImageSrc } from "./rich-text";
import {
  checkRichTextImageFile,
  defaultRichTextImageRules,
  normalizeRichTextUpload,
  type RichTextImageRules,
  type RichTextUpload,
  richTextImageFileName,
} from "./rich-text-extras";

/** What `uploadFn` may resolve to: a URL, a URL with the stored file's id, or `null` for a failed upload. */
export type RichTextUploadResult =
  | string
  | { id: string | number; src: string }
  | null;

export type RichTextImageErrorReason =
  /** The file type is not allowed. */
  | "type"
  /** The file is over `maxFileSize`. */
  | "size"
  /** The URL is not a safe image source. */
  | "src"
  /** The upload threw, returned `null`, or returned an unsafe URL. */
  | "upload";

export interface RichTextImageError {
  reason: RichTextImageErrorReason;
  file: File | null;
  /** What `uploadFn` threw, for an `upload` error. */
  // type-escape: server: a catch binding is unknown
  cause?: unknown;
}

/** The image settings of `<RichTextInput images={...}>`: core's rules, each optional, plus the two callbacks. */
export interface RichTextImageOptions extends Partial<RichTextImageRules> {
  /**
   * Stores a file and resolves to its URL. Without it a file is stored in the
   * HTML as a data URL when `allowBase64` is on.
   */
  uploadFn?: (file: File) => Promise<RichTextUploadResult>;
  /** Called for a file or URL that is refused, and for an upload that fails. */
  onImageError?: (error: RichTextImageError) => void;
}

export interface RichTextImageConfig {
  rules: RichTextImageRules;
  uploadFn: RichTextImageOptions["uploadFn"];
  onImageError: RichTextImageOptions["onImageError"];
}

/** `images` from the input's props, with core's defaults under every rule. */
export function resolveRichTextImageConfig(
  images: boolean | RichTextImageOptions,
): RichTextImageConfig {
  const options = typeof images === "object" ? images : {};
  return {
    rules: {
      allowedMimeTypes:
        options.allowedMimeTypes ?? defaultRichTextImageRules.allowedMimeTypes,
      maxFileSize: options.maxFileSize ?? defaultRichTextImageRules.maxFileSize,
      allowBase64: options.allowBase64 ?? defaultRichTextImageRules.allowBase64,
    },
    uploadFn: options.uploadFn,
    onImageError: options.onImageError,
  };
}

export type RichTextImageInput =
  | File
  | { src: string; alt?: string; title?: string };

/** What a finished upload left on its image: the stored source, or `null` when it failed. */
export interface RichTextStoredImage {
  src: string | null;
  id: string | null;
}

/*
 * Uploads per editor, keyed by the file's `blob:` URL. `pending` drives the
 * view's spinner. `settled` outlives the blob: undo can bring back an image
 * that still has the `blob:` source, and the plugin swaps in what was stored.
 */
interface UploadState {
  pending: ReadonlySet<string>;
  settled: Map<string, RichTextStoredImage>;
  listeners: Set<() => void>;
}

const uploadStates = new WeakMap<object, UploadState>();

export function richTextImageUploadState(editor: object): UploadState {
  const existing = uploadStates.get(editor);
  if (existing) return existing;
  const created: UploadState = {
    pending: new Set(),
    settled: new Map(),
    listeners: new Set(),
  };
  uploadStates.set(editor, created);
  return created;
}

export function setRichTextImageUploading(
  editor: object,
  src: string,
  uploading: boolean,
) {
  const state = richTextImageUploadState(editor);
  const pending = new Set(state.pending);
  if (uploading) pending.add(src);
  else pending.delete(src);
  state.pending = pending;
  for (const listener of state.listeners) listener();
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The file could not be read"));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Without `uploadFn` the file becomes a data URL, which only some raster types may be. */
function canBeDataUrl(file: File, allowBase64: boolean): boolean {
  const type = (file.type.split(";")[0] ?? "").trim();
  return (
    !allowBase64 ||
    isSafeImageSrc(`data:${type};base64,`, { allowDataImages: true })
  );
}

export async function storeRichTextImageFile(
  file: File,
  { rules, uploadFn }: RichTextImageConfig,
): Promise<RichTextUpload> {
  const result = uploadFn
    ? await uploadFn(file)
    : rules.allowBase64
      ? await readDataUrl(file)
      : null;
  const upload =
    result === null ? null : normalizeRichTextUpload(result, rules);
  if (upload === null) throw new Error("No safe image source was stored");
  return upload;
}

function triggerDownload(href: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
}

export async function downloadRichTextImage(src: string, alt: string) {
  try {
    const blob = await (await fetch(src)).blob();
    const url = URL.createObjectURL(blob);
    triggerDownload(url, richTextImageFileName(alt, blob.type));
    setTimeout(() => URL.revokeObjectURL(url));
  } catch {
    // The host refuses a cross-origin fetch; the browser may still save the link.
    triggerDownload(src, richTextImageFileName(alt, ""));
  }
}

/** Browsers take only PNG on the clipboard, so other formats are redrawn as one. */
async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (png) => (png ? resolve(png) : reject(new Error("No PNG was produced"))),
      "image/png",
    ),
  );
}

export async function copyRichTextImage(src: string) {
  const blob = await toPng(await (await fetch(src)).blob());
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** DOMPurify's image hook, shared by both fields on their own sanitizer instances. */
export function sanitizeRichTextImageElement(node: Node): void {
  if (node.nodeName !== "IMG" || !(node instanceof window.Element)) return;
  const src = node.getAttribute("src");
  if (src === null || !isSafeImageSrc(src, { allowDataImages: true }))
    node.remove();
}

interface PreparedImage {
  src: string;
  alt?: string;
  title?: string;
  fileName?: string;
}

/** Validate a batch and prepare its temporary previews before an adapter inserts it. */
export function prepareRichTextImages(
  inputs: readonly RichTextImageInput[],
  config: RichTextImageConfig,
) {
  const attributes: PreparedImage[] = [];
  const uploads: { file: File; blobUrl: string }[] = [];
  const { rules, onImageError } = config;
  for (const input of inputs) {
    if (!(input instanceof File)) {
      if (isSafeImageSrc(input.src, { allowDataImages: rules.allowBase64 }))
        attributes.push(input);
      else onImageError?.({ reason: "src", file: null });
      continue;
    }
    const reason =
      checkRichTextImageFile(input, rules) ??
      (config.uploadFn === undefined && !canBeDataUrl(input, rules.allowBase64)
        ? "type"
        : null);
    if (reason) {
      onImageError?.({ reason, file: input });
      continue;
    }
    const blobUrl = URL.createObjectURL(input);
    uploads.push({ file: input, blobUrl });
    attributes.push({
      src: blobUrl,
      alt: input.name.replace(/\.[^.]*$/, ""),
      fileName: input.name,
    });
  }
  return { attributes, uploads };
}

function imageDimension(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Extra image attributes in the stored HTML, with finite dimensions only. */
export function richTextImageAttributes() {
  const dimension = (key: "width" | "height") => ({
    default: null,
    parseHTML: (element: HTMLElement) => {
      const raw = element.getAttribute(key);
      return raw === null ? null : imageDimension(Number.parseFloat(raw));
    },
    renderHTML: (attrs: { width?: number | null; height?: number | null }) =>
      imageDimension(attrs[key]) === null ? {} : { [key]: attrs[key] },
  });
  return {
    id: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("data-id"),
      renderHTML: (attrs: { id?: string | number | null }) =>
        attrs.id == null ? {} : { "data-id": String(attrs.id) },
    },
    fileName: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        element.getAttribute("data-file-name"),
      renderHTML: (attrs: { fileName?: string | null }) =>
        attrs.fileName == null
          ? {}
          : { "data-file-name": String(attrs.fileName) },
    },
    width: dimension("width"),
    height: dimension("height"),
  };
}

/** Narrows options from the editor library's untyped extension boundary. */
export function isRichTextImageConfigSource(
  options: unknown,
): options is { config: () => RichTextImageConfig } {
  return (
    typeof options === "object" &&
    options !== null &&
    "config" in options &&
    typeof options.config === "function"
  );
}
