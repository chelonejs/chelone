import {
  clampRichTextImageWidth,
  copyRichTextImage,
  downloadRichTextImage,
  isRichTextImageConfigSource,
  isSafeImageSrc,
  prepareRichTextImages,
  type RichTextImageActionId,
  type RichTextImageConfig,
  type RichTextImageError,
  type RichTextImageInput,
  type RichTextImageOptions,
  type RichTextStoredImage,
  type RichTextUploadResult,
  resolveRichTextImageConfig,
  richTextImageActions,
  richTextImageAttributes,
  richTextImageUploadState,
  setRichTextImageUploading,
  storeRichTextImageFile,
} from "@chelone/core";
import type { Editor, JSONContent } from "@tiptap/core";
import { getHTMLFromFragment, isNodeEmpty, nodeInputRule } from "@tiptap/core";
import Image, { type ImageOptions, inputRegex } from "@tiptap/extension-image";
import type { Attrs } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
} from "@tiptap/react";
import {
  DownloadIcon,
  EyeIcon,
  ImageIcon,
  ImageOffIcon,
  LinkIcon,
  LoaderCircleIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";

interface RichTextImageExtensionOptions extends ImageOptions {
  /** Read on every use, so the input's latest props apply without a new editor. */
  config: () => RichTextImageConfig;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    richTextImages: {
      /**
       * Inserts images at the selection: a file after `checkRichTextImageFile`,
       * shown from a `blob:` URL until it is stored, and a URL that is a safe
       * image source. A refused one reports through `onImageError` and is
       * skipped.
       */
      setImages: (images: readonly RichTextImageInput[]) => ReturnType;
    };
  }
}

const MIN_WIDTH = 60;
const KEY_STEP = 10;

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function size(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Sets what an upload stored on the image whose `src` is `from`, outside the undo history. */
function patchImage(
  editor: Editor,
  type: string,
  from: string,
  stored: RichTextStoredImage,
) {
  richTextImageUploadState(editor).settled.set(from, stored);
  if (editor.isDestroyed) return;
  const { state, view } = editor;
  let position: number | null = null;
  state.doc.descendants((node, pos) => {
    if (position === null && node.type.name === type && node.attrs.src === from)
      position = pos;
    return position === null;
  });
  const node = position === null ? null : state.doc.nodeAt(position);
  if (position === null || node === null) return;
  view.dispatch(
    state.tr
      .setNodeMarkup(position, undefined, { ...node.attrs, ...stored })
      .setMeta("addToHistory", false),
  );
}

async function storeAndPatch(
  editor: Editor,
  type: string,
  file: File,
  blobUrl: string,
  config: RichTextImageConfig,
) {
  setRichTextImageUploading(editor, blobUrl, true);
  try {
    const upload = await storeRichTextImageFile(file, config);
    patchImage(editor, type, blobUrl, { src: upload.src, id: upload.id });
  } catch (cause) {
    // No blob: source stays behind; the view shows its error state.
    patchImage(editor, type, blobUrl, { src: null, id: null });
    config.onImageError?.({ reason: "upload", file, cause });
  } finally {
    setRichTextImageUploading(editor, blobUrl, false);
    URL.revokeObjectURL(blobUrl);
  }
}

function imageFiles(files: FileList | undefined | null): File[] {
  return Array.from(files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

const imagePluginKey = new PluginKey("richTextImage");

const RichTextImage = Image.extend<RichTextImageExtensionOptions>({
  atom: true,

  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
      resize: false,
      config: () => resolveRichTextImageConfig(true),
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      ...richTextImageAttributes(),
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        // An unsafe source drops the image from the document.
        getAttrs: (element) =>
          typeof element !== "string" &&
          isSafeImageSrc(element.getAttribute("src") ?? "", {
            allowDataImages: this.options.config().rules.allowBase64,
          })
            ? null
            : false,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  addCommands() {
    const type = this.name;
    return {
      setImage:
        ({ src, alt, title, width, height }) =>
        ({ commands }) =>
          isSafeImageSrc(src, {
            allowDataImages: this.options.config().rules.allowBase64,
          }) &&
          commands.insertContent({
            type,
            attrs: { src, alt, title, width, height },
          }),
      setImages:
        (inputs) =>
        ({ commands, dispatch, editor }) => {
          if (!dispatch) return inputs.length > 0;
          const config = this.options.config();
          const prepared = prepareRichTextImages(inputs, config);
          const stored = prepared.uploads;
          const content: JSONContent[] = prepared.attributes.map((attrs) => ({
            type,
            attrs,
          }));
          if (content.length === 0) return false;
          if (!commands.insertContent(content)) {
            for (const { blobUrl } of stored) URL.revokeObjectURL(blobUrl);
            return false;
          }
          for (const { file, blobUrl } of stored) {
            void storeAndPatch(editor, type, file, blobUrl, config);
          }
          return true;
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        // `![](javascript:...)` typed in the editor must not become an image.
        getAttributes: (match) => {
          const [, , alt, src, title] = match;
          return src !== undefined &&
            isSafeImageSrc(src, {
              allowDataImages: this.options.config().rules.allowBase64,
            })
            ? { src, alt, title }
            : false;
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const type = this.name;
    const editor = this.editor;
    return [
      new Plugin({
        key: imagePluginKey,
        props: {
          handlePaste: (_view, event) => {
            const files = imageFiles(event.clipboardData?.files);
            if (files.length === 0) return false;
            event.preventDefault();
            return editor.commands.setImages(files);
          },
          handleDrop: (view, event) => {
            const files = imageFiles(event.dataTransfer?.files);
            if (files.length === 0) return false;
            event.preventDefault();
            const at = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (at) editor.commands.setTextSelection(at.pos);
            return editor.commands.setImages(files);
          },
        },
        // An image brought back by undo or paste, whose upload has finished.
        appendTransaction: (transactions, _previous, state) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }
          const { settled } = richTextImageUploadState(editor);
          if (settled.size === 0) return null;
          const fixes: { pos: number; attrs: Attrs }[] = [];
          state.doc.descendants((node, pos) => {
            const src = node.type.name === type ? text(node.attrs.src) : null;
            const stored = src === null ? undefined : settled.get(src);
            if (stored)
              fixes.push({ pos, attrs: { ...node.attrs, ...stored } });
          });
          if (fixes.length === 0) return null;
          const tr = state.tr.setMeta("addToHistory", false);
          for (const { pos, attrs } of fixes) {
            tr.setNodeMarkup(pos, undefined, attrs);
          }
          return tr;
        },
        // An upload still running when the editor goes gives its blob: URL back.
        view: () => ({
          destroy: () => {
            for (const src of richTextImageUploadState(editor).pending) {
              URL.revokeObjectURL(src);
            }
          },
        }),
      }),
    ];
  },
});

/** The image settings in force for `editor`, or `null` when it has no image extension. */
function getRichTextImageConfig(editor: Editor): RichTextImageConfig | null {
  const extension = editor.extensionManager.extensions.find(
    (candidate) => candidate.name === RichTextImage.name,
  );
  const options = extension?.options;
  return isRichTextImageConfigSource(options) ? options.config() : null;
}

/**
 * The editor's HTML as the form value. An image that is still uploading, or
 * whose upload failed, has no stored source yet, so it is left out: a `blob:`
 * URL only exists in this tab. The finished upload changes the document and
 * writes the value again.
 */
function getRichTextHtml(editor: Editor): string {
  const { doc, tr } = editor.state;
  const unstored: { from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== RichTextImage.name) return;
    const src = text(node.attrs.src);
    if (src === null || src.startsWith("blob:")) {
      unstored.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  for (const { from, to } of unstored.reverse()) tr.delete(from, to);
  const kept = tr.doc;
  if (isNodeEmpty(kept)) return "";
  return unstored.length === 0
    ? editor.getHTML()
    : getHTMLFromFragment(kept.content, editor.schema);
}

const actionIcons: Record<
  RichTextImageActionId,
  ComponentType<{ className?: string }>
> = {
  view: EyeIcon,
  download: DownloadIcon,
  copyImage: ImageIcon,
  copyLink: LinkIcon,
  remove: Trash2Icon,
};

function ImageOverlay({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes it from the document, and the close button is the keyboard route
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={
        alt || translate("chelone.rich_text.image.view", { _: "View image" })
      }
      tabIndex={-1}
      data-slot="rich-text-image-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 outline-none"
      onClick={onClose}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="absolute top-4 right-4"
        aria-label={translate("chelone.rich_text.image.close", { _: "Close" })}
        onClick={onClose}
      >
        <XIcon />
      </Button>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain"
      />
    </div>,
    document.body,
  );
}

type HandleSide = "left" | "right";

function ResizeHandle({
  side,
  onPointerDown,
  onKeyDown,
}: {
  side: HandleSide;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  const translate = useTranslate();
  const label =
    side === "left"
      ? translate("chelone.rich_text.image.resize_left", {
          _: "Resize image from the left edge",
        })
      : translate("chelone.rich_text.image.resize_right", {
          _: "Resize image from the right edge",
        });
  return (
    <button
      type="button"
      aria-label={label}
      data-slot="rich-text-image-handle"
      data-side={side}
      className={cn(
        "absolute top-1/2 h-10 w-2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border border-background bg-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        side === "left" ? "-left-1" : "-right-1",
      )}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}

function ImageView({
  node,
  editor,
  selected,
  getPos,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const translate = useTranslate();
  const src = text(node.attrs.src);
  const alt = text(node.attrs.alt) ?? "";
  const title = text(node.attrs.title) ?? undefined;
  const width = size(node.attrs.width);

  const editable = useEditorState({
    editor,
    selector: ({ editor: e }) => e.isEditable,
  });
  const subscribe = useMemo(
    () => (listener: () => void) => {
      const { listeners } = richTextImageUploadState(editor);
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    [editor],
  );
  const uploading = useSyncExternalStore(
    subscribe,
    () => src !== null && richTextImageUploadState(editor).pending.has(src),
  );

  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);

  // The only way an `img` reaches the DOM: stored HTML is not trusted.
  const safeSrc =
    src !== null && isSafeImageSrc(src, { allowDataImages: true }) ? src : null;
  const shownSrc = safeSrc !== null && failedSrc !== safeSrc ? safeSrc : null;

  function limits() {
    const editorWidth = editor.view.dom.clientWidth;
    return {
      min: MIN_WIDTH,
      max: editorWidth > 0 ? editorWidth : Number.POSITIVE_INFINITY,
    };
  }

  // Read from the document: key repeat outruns React's render of the last change.
  function currentWidth(): number {
    const pos = getPos();
    const live =
      pos === undefined ? node : (editor.state.doc.nodeAt(pos) ?? node);
    return size(live.attrs.width) ?? (image.current?.offsetWidth || MIN_WIDTH);
  }

  function resizeBy(delta: number) {
    updateAttributes({
      width: clampRichTextImageWidth(currentWidth() + delta, limits()),
    });
  }

  function onHandleKeyDown(
    side: HandleSide,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    // The handle's own edge moves in the arrow's direction.
    const towardRight = event.key === "ArrowRight";
    resizeBy(towardRight === (side === "right") ? KEY_STEP : -KEY_STEP);
  }

  function onHandlePointerDown(
    side: HandleSide,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    stopDrag.current?.();
    const startX = event.clientX;
    const startWidth = currentWidth();
    const range = limits();
    const sign = side === "right" ? 1 : -1;
    let latest = startWidth;
    const move = (moveEvent: PointerEvent) => {
      latest = clampRichTextImageWidth(
        startWidth + sign * (moveEvent.clientX - startX),
        range,
      );
      setDragWidth(latest);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
    };
    const end = () => {
      stop();
      setDragWidth(null);
      updateAttributes({ width: latest });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    stopDrag.current = stop;
  }

  function run(id: RichTextImageActionId) {
    // Clipboard and fetch can be refused by the browser or the image's host.
    const ignore = () => {};
    if (id === "remove") deleteNode();
    else if (src === null) return;
    else if (id === "view") setViewing(true);
    else if (id === "download")
      void downloadRichTextImage(src, alt).catch(ignore);
    else if (id === "copyImage") void copyRichTextImage(src).catch(ignore);
    else void navigator.clipboard.writeText(src).catch(ignore);
  }

  const actions = richTextImageActions.filter((action) =>
    action.id === "remove" ? editable : shownSrc !== null,
  );

  return (
    <NodeViewWrapper
      data-slot="rich-text-image"
      data-selected={selected || undefined}
      className="group relative my-3 w-fit max-w-full"
    >
      {shownSrc !== null ? (
        <img
          ref={image}
          src={shownSrc}
          alt={alt}
          title={title}
          width={dragWidth ?? width ?? undefined}
          draggable
          data-drag-handle
          className={cn(
            "h-auto max-w-full rounded-md",
            selected && "ring-2 ring-ring",
          )}
          onError={() => setFailedSrc(shownSrc)}
        />
      ) : (
        <div
          data-slot="rich-text-image-error"
          className="flex items-center gap-2 rounded-md border border-destructive/50 border-dashed px-3 py-2 text-destructive text-sm"
        >
          <ImageOffIcon className="size-4" />
          {translate("chelone.rich_text.image.error", {
            _: "The image could not be loaded",
          })}
        </div>
      )}
      {uploading ? (
        <div
          role="status"
          aria-label={translate("chelone.rich_text.image.uploading", {
            _: "Uploading image",
          })}
          className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60"
        >
          <LoaderCircleIcon className="size-6 animate-spin" />
        </div>
      ) : null}
      <div
        data-slot="rich-text-image-actions"
        className={cn(
          "absolute top-2 right-2 flex gap-1 rounded-md border bg-background p-1 opacity-0 shadow-sm focus-within:opacity-100 group-hover:opacity-100",
          selected && "opacity-100",
        )}
      >
        {actions.map((action) => {
          const Icon = actionIcons[action.id];
          const label = translate(action.labelKey, { _: action.defaultLabel });
          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label}
                  onClick={() => run(action.id)}
                >
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {selected && editable && shownSrc !== null
        ? (["left", "right"] as const).map((side) => (
            <ResizeHandle
              key={side}
              side={side}
              onPointerDown={(event) => onHandlePointerDown(side, event)}
              onKeyDown={(event) => onHandleKeyDown(side, event)}
            />
          ))
        : null}
      {viewing && shownSrc !== null ? (
        <ImageOverlay
          src={shownSrc}
          alt={alt}
          onClose={() => setViewing(false)}
        />
      ) : null}
    </NodeViewWrapper>
  );
}

export {
  getRichTextHtml,
  getRichTextImageConfig,
  RichTextImage,
  type RichTextImageConfig,
  type RichTextImageError,
  type RichTextImageInput,
  type RichTextImageOptions,
  type RichTextUploadResult,
  resolveRichTextImageConfig,
};
