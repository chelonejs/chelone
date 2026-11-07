import { isSafeImageSrc, MAX_IMAGE_BYTES, toEmbedSrc } from "@chelone/core";
import {
  ChevronRightIcon,
  ImageIcon,
  InfoIcon,
  ListCollapseIcon,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import {
  type BlockConfigProps,
  type BlockDefinition,
  type BlockRenderProps,
  defineBlock,
  NodeViewContent,
} from "./block-nodes";

const calloutSchema = z.object({
  variant: z.enum(["info", "warning", "success"]).default("info"),
});

const variantClass = {
  info: "border-blue-500/50 bg-blue-500/10",
  warning: "border-amber-500/50 bg-amber-500/10",
  success: "border-green-500/50 bg-green-500/10",
};

function CalloutView({
  attrs,
}: BlockRenderProps<z.infer<typeof calloutSchema>>) {
  return (
    <div
      data-variant={attrs.variant}
      className={cn("my-2 rounded-md border p-3", variantClass[attrs.variant])}
    >
      <NodeViewContent />
    </div>
  );
}

/** A bordered box of blocks, tinted by `variant`. */
export const calloutBlock = defineBlock({
  name: "callout",
  label: "Callout",
  group: "Text",
  keywords: ["note", "alert", "info", "warning"],
  description: "Highlight a note in a box",
  schema: calloutSchema,
  content: "block+",
  config: "auto",
  icon: InfoIcon,
  render: CalloutView,
});

const toggleSchema = z.object({
  summary: z.string().default("Toggle"),
  open: z.boolean().default(false),
});

function ToggleView({
  attrs,
  mode,
}: BlockRenderProps<z.infer<typeof toggleSchema>>) {
  // A reader opens a toggle for themselves; the document keeps its own `open`.
  const [readerOpen, setReaderOpen] = useState(attrs.open);
  const editing = mode === "edit";
  const open = editing || readerOpen;
  return (
    <div className="my-2">
      <button
        type="button"
        aria-expanded={open}
        className="flex items-center gap-1 font-medium"
        onClick={() => {
          if (!editing) setReaderOpen(!readerOpen);
        }}
      >
        <ChevronRightIcon
          className={cn("size-4 transition-transform", open && "rotate-90")}
        />
        <span>{attrs.summary}</span>
      </button>
      <div hidden={!open} className="pl-5">
        <NodeViewContent />
      </div>
    </div>
  );
}

/** A summary line over blocks that a reader opens and closes. The editor always shows them. */
export const toggleBlock = defineBlock({
  name: "toggle",
  label: "Toggle",
  group: "Text",
  keywords: ["collapse", "details", "accordion"],
  description: "Hide blocks under a summary",
  schema: toggleSchema,
  content: "block+",
  config: "auto",
  icon: ListCollapseIcon,
  render: ToggleView,
});

const imageSchema = z.object({
  src: z.string().default(""),
  alt: z.string().default(""),
  widthPct: z.number().min(10).max(100).default(100),
});
type ImageAttrs = z.infer<typeof imageSchema>;

function ImageView({ attrs }: BlockRenderProps<ImageAttrs>) {
  const translate = useTranslate();
  if (
    attrs.src === "" ||
    !isSafeImageSrc(attrs.src, { allowDataImages: true })
  ) {
    return (
      <div className="my-2 rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
        {translate("chelone.block_editor.image.empty", { _: "Add an image" })}
      </div>
    );
  }
  return (
    <img
      src={attrs.src}
      alt={attrs.alt}
      style={{ width: `${attrs.widthPct}%` }}
      className="my-2 h-auto max-w-full rounded-md"
    />
  );
}

function ImageConfig({ attrs, onChange }: BlockConfigProps<ImageAttrs>) {
  const translate = useTranslate();
  const [failed, setFailed] = useState(false);
  // The draft lets the user type through a width below the minimum.
  const [draft, setDraft] = useState<string | null>(null);

  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
      setFailed(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (
        typeof result === "string" &&
        isSafeImageSrc(result, { allowDataImages: true })
      ) {
        setFailed(false);
        onChange({ src: result });
      } else setFailed(true);
    };
    reader.onerror = () => setFailed(true);
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block-image-src">
          {translate("chelone.block_editor.image.url", { _: "Image URL" })}
        </Label>
        <Input
          id="block-image-src"
          type="url"
          value={attrs.src.startsWith("data:") ? "" : attrs.src}
          onChange={(event) => onChange({ src: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block-image-alt">
          {translate("chelone.block_editor.image.alt", { _: "Alt text" })}
        </Label>
        <Input
          id="block-image-alt"
          value={attrs.alt}
          onChange={(event) => onChange({ alt: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block-image-width">
          {translate("chelone.block_editor.image.width", { _: "Width (%)" })}
        </Label>
        <Input
          id="block-image-width"
          type="number"
          min={10}
          max={100}
          value={draft ?? String(attrs.widthPct)}
          onChange={(event) => {
            const { value } = event.target;
            setDraft(value);
            const width = Number(value);
            if (value !== "" && width >= 10 && width <= 100) {
              onChange({ widthPct: width });
            }
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block-image-file">
          {translate("chelone.block_editor.image.upload", {
            _: "Upload image",
          })}
        </Label>
        <Input
          id="block-image-file"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            upload(file);
          }}
        />
        {failed ? (
          <p role="alert" className="text-destructive text-sm">
            {translate("chelone.block_editor.image.too_large", {
              _: "Choose an image file up to 5 MB",
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** An image from a URL, or from a file of up to 5 MB stored in the document as a data URL. */
export const imageBlock = defineBlock({
  name: "image",
  label: "Image",
  group: "Media",
  keywords: ["picture", "photo"],
  description: "Show an image from a URL or a file",
  schema: imageSchema,
  config: ImageConfig,
  icon: ImageIcon,
  render: ImageView,
});

const embedSchema = z.object({ url: z.string().default("") });

function EmbedView({ attrs }: BlockRenderProps<z.infer<typeof embedSchema>>) {
  const translate = useTranslate();
  const src = toEmbedSrc(attrs.url);
  if (src === null) {
    return (
      <div className="my-2 rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
        {translate("chelone.block_editor.embed.empty", {
          _: "Add a YouTube or Vimeo link",
        })}
      </div>
    );
  }
  return (
    <iframe
      src={src}
      title={translate("chelone.block_editor.embed.title", {
        _: "Embedded video",
      })}
      sandbox="allow-scripts allow-same-origin allow-presentation"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className="my-2 aspect-video w-full rounded-md border"
    />
  );
}

/** A YouTube or Vimeo video in a sandboxed iframe. Any other URL shows an empty state. */
export const embedBlock = defineBlock({
  name: "embed",
  label: "Embed",
  group: "Media",
  keywords: ["video", "youtube", "vimeo"],
  description: "Embed a YouTube or Vimeo video",
  schema: embedSchema,
  config: "auto",
  icon: VideoIcon,
  render: EmbedView,
});

/** The blocks an editor offers when it is given none. */
export const defaultBlocks: readonly BlockDefinition[] = [
  calloutBlock,
  toggleBlock,
  imageBlock,
  embedBlock,
];
