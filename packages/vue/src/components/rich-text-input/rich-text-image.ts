import {
  isSafeImageSrc,
  prepareRichTextImages,
  type RichTextImageConfig,
  type RichTextImageInput,
  resolveRichTextImageConfig,
  richTextImageAttributes,
  type Stored,
  setUploading,
  storeFile,
  uploadStateOf,
} from "@chelone/core";
import {
  type Editor,
  getHTMLFromFragment,
  isNodeEmpty,
  type JSONContent,
  nodeInputRule,
} from "@tiptap/core";
import Image, { type ImageOptions, inputRegex } from "@tiptap/extension-image";
import { Plugin } from "@tiptap/pm/state";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import RichTextImageView from "./rich-text-image-view.vue";

interface Options extends ImageOptions {
  config: () => RichTextImageConfig;
}
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    richTextImages: {
      setImages: (images: readonly RichTextImageInput[]) => ReturnType;
    };
  }
}

function patch(editor: Editor, source: string, stored: Stored) {
  uploadStateOf(editor).settled.set(source, stored);
  if (editor.isDestroyed) return;
  const transaction = editor.state.tr.setMeta("addToHistory", false);
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === source) {
      transaction.setNodeMarkup(pos, undefined, { ...node.attrs, ...stored });
    }
  });
  if (transaction.docChanged) editor.view.dispatch(transaction);
}

async function upload(
  editor: Editor,
  file: File,
  src: string,
  config: RichTextImageConfig,
) {
  setUploading(editor, src, true);
  try {
    patch(editor, src, await storeFile(file, config));
  } catch (cause) {
    patch(editor, src, { src: null, id: null });
    config.onImageError?.({ reason: "upload", file, cause });
  } finally {
    setUploading(editor, src, false);
    URL.revokeObjectURL(src);
  }
}

export const RichTextImage = Image.extend<Options>({
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
    return VueNodeViewRenderer(RichTextImageView);
  },
  addCommands() {
    return {
      setImage:
        (attrs) =>
        ({ commands }) =>
          isSafeImageSrc(attrs.src, {
            allowDataImages: this.options.config().rules.allowBase64,
          }) && commands.insertContent({ type: this.name, attrs }),
      setImages:
        (images) =>
        ({ commands, dispatch, editor }) => {
          if (!dispatch) return images.length > 0;
          const config = this.options.config();
          const prepared = prepareRichTextImages(images, config);
          const content: JSONContent[] = prepared.attributes.map((attrs) => ({
            type: this.name,
            attrs,
          }));
          const inserted =
            content.length > 0 && commands.insertContent(content);
          for (const item of prepared.uploads) {
            if (inserted) void upload(editor, item.file, item.blobUrl, config);
            else URL.revokeObjectURL(item.blobUrl);
          }
          return inserted;
        },
    };
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;
          return src &&
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
    const editor = this.editor;
    const files = (list?: FileList | null) =>
      Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const images = files(event.clipboardData?.files);
            if (!images.length) return false;
            event.preventDefault();
            return editor.commands.setImages(images);
          },
          handleDrop: (view, event) => {
            const images = files(event.dataTransfer?.files);
            if (!images.length) return false;
            event.preventDefault();
            const position = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (position) editor.commands.setTextSelection(position.pos);
            return editor.commands.setImages(images);
          },
        },
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((item) => item.docChanged)) return null;
          const tr = state.tr.setMeta("addToHistory", false);
          state.doc.descendants((node, pos) => {
            if (node.type.name !== this.name) return;
            const stored = uploadStateOf(editor).settled.get(node.attrs.src);
            if (stored)
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...stored });
          });
          return tr.docChanged ? tr : null;
        },
        view: () => ({
          destroy: () => {
            for (const src of uploadStateOf(editor).pending)
              URL.revokeObjectURL(src);
          },
        }),
      }),
    ];
  },
});

export function getRichTextImageConfig(
  editor: Editor,
): RichTextImageConfig | null {
  const extension = editor.extensionManager.extensions.find(
    (item) => item.name === RichTextImage.name,
  );
  if (!extension) return null;
  // Extension options are supplied by tiptap's untyped extension boundary.
  const options: Options = extension.options;
  return options.config();
}

export function getRichTextHtml(editor: Editor): string {
  const ranges: { pos: number; length: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === "image" &&
      (typeof node.attrs.src !== "string" || node.attrs.src.startsWith("blob:"))
    )
      ranges.push({ pos, length: node.nodeSize });
  });
  if (!ranges.length) return editor.isEmpty ? "" : editor.getHTML();
  const transaction = editor.state.tr;
  for (const { pos, length } of ranges.reverse())
    transaction.delete(pos, pos + length);
  return isNodeEmpty(transaction.doc)
    ? ""
    : getHTMLFromFragment(transaction.doc.content, editor.schema);
}
export {
  type RichTextImageOptions,
  resolveRichTextImageConfig,
} from "@chelone/core";
