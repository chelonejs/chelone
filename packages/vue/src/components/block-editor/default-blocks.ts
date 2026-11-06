import { z } from "zod";
import {
  ImageIcon,
  InfoIcon,
  ListCollapseIcon,
  VideoIcon,
} from "./block-icons";
import { type BlockDefinition, defineBlock } from "./block-nodes";
import CalloutBlock from "./callout-block.vue";
import EmbedBlock from "./embed-block.vue";
import ImageBlock from "./image-block.vue";
import ImageBlockConfig from "./image-block-config.vue";
import ToggleBlock from "./toggle-block.vue";

const calloutSchema = z.object({
  variant: z.enum(["info", "warning", "success"]).default("info"),
});
export type CalloutAttrs = z.infer<typeof calloutSchema>;

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
  render: CalloutBlock,
});

const toggleSchema = z.object({
  summary: z.string().default("Toggle"),
  open: z.boolean().default(false),
});
export type ToggleAttrs = z.infer<typeof toggleSchema>;

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
  render: ToggleBlock,
});

const imageSchema = z.object({
  src: z.string().default(""),
  alt: z.string().default(""),
  widthPct: z.number().min(10).max(100).default(100),
});
export type ImageAttrs = z.infer<typeof imageSchema>;

/** An image from a URL, or from a file of up to 5 MB stored in the document as a data URL. */
export const imageBlock = defineBlock({
  name: "image",
  label: "Image",
  group: "Media",
  keywords: ["picture", "photo"],
  description: "Show an image from a URL or a file",
  schema: imageSchema,
  config: ImageBlockConfig,
  icon: ImageIcon,
  render: ImageBlock,
});

const embedSchema = z.object({ url: z.string().default("") });
export type EmbedAttrs = z.infer<typeof embedSchema>;

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
  render: EmbedBlock,
});

/** The blocks an editor offers when it is given none. */
export const defaultBlocks: readonly BlockDefinition[] = [
  calloutBlock,
  toggleBlock,
  imageBlock,
  embedBlock,
];
