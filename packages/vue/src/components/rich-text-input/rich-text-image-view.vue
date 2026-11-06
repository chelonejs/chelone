<script setup lang="ts">
import {
  clampRichTextImageWidth,
  copyRichTextImage,
  downloadRichTextImage,
  isSafeImageSrc,
  type RichTextImageActionId,
  richTextImageActions,
  richTextImageUploadState,
} from "@chelone/core";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import {
  computed,
  nextTick,
  onScopeDispose,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useTranslate } from "../../i18n/use-translate";
import Button from "../ui/button.vue";
import {
  richTextImageActionIcons,
  richTextImageCloseIcon,
  richTextImageIcon,
  richTextImageSpinnerIcon,
} from "./rich-text-icons";

const props = defineProps(nodeViewProps);
const translate = useTranslate();
const image = useTemplateRef<HTMLImageElement>("image");
const overlay = useTemplateRef<HTMLDivElement>("overlay");
const viewing = ref(false);
const failedSrc = ref<string | null>(null);
const dragWidth = ref<number>();
let drag: AbortController | undefined;

watch(viewing, async (open) => {
  if (!open) return;
  await nextTick();
  overlay.value?.focus();
});
const closeOnEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") viewing.value = false;
};
document.addEventListener("keydown", closeOnEscape);

const revision = ref(0);
const uploads = richTextImageUploadState(props.editor);
const refresh = () => { revision.value++; };
props.editor.on("transaction", refresh);
uploads.listeners.add(refresh);
onScopeDispose(() => {
  props.editor.off("transaction", refresh);
  uploads.listeners.delete(refresh);
  document.removeEventListener("keydown", closeOnEscape);
  drag?.abort();
});

const editable = computed(() => {
  void revision.value;
  return props.editor.isEditable;
});
const uploading = computed(() => {
  void revision.value;
  return uploads.pending.has(props.node.attrs.src);
});
// Stored document attributes are untrusted, even when they bypass HTML parsing.
const source = computed(() =>
  typeof props.node.attrs.src === "string" &&
  isSafeImageSrc(props.node.attrs.src, { allowDataImages: true })
    ? props.node.attrs.src
    : null,
);
const src = computed(() => source.value !== failedSrc.value ? source.value : null);
const width = computed(() => numericWidth(props.node.attrs.width));
const actions = computed(() =>
  richTextImageActions.filter((action) =>
    action.id === "remove" ? editable.value : src.value !== null,
  ),
);

function numericWidth(value: number | string | null | undefined): number | undefined {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function dragHandle(event: PointerEvent, side: "left" | "right") {
  event.preventDefault();
  drag?.abort();
  const controller = new AbortController();
  drag = controller;
  const initial = numericWidth(props.node.attrs.width) ?? (image.value?.offsetWidth || 60);
  const maximum = props.editor.view.dom.clientWidth || Number.POSITIVE_INFINITY;
  const start = event.clientX;
  const options = { signal: controller.signal };
  let latest = initial;
  window.addEventListener("pointermove", (move) => {
    const change = (move.clientX - start) * (side === "left" ? -1 : 1);
    latest = clampRichTextImageWidth(initial + change, { min: 60, max: maximum });
    dragWidth.value = latest;
  }, options);
  const finish = () => {
    controller.abort();
    drag = undefined;
    dragWidth.value = undefined;
    props.updateAttributes({ width: latest });
  };
  window.addEventListener("pointerup", finish, options);
  window.addEventListener("pointercancel", finish, options);
}

function resize(event: KeyboardEvent, side: "left" | "right") {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  // Read the document because key repeat can outrun Vue's node props.
  const pos = props.getPos();
  const attrs = pos === undefined ? props.node.attrs : props.editor.state.doc.nodeAt(pos)?.attrs;
  const current = numericWidth(attrs?.width) ?? (image.value?.offsetWidth || 60);
  const step = (event.key === "ArrowRight") === (side === "right") ? 10 : -10;
  props.updateAttributes({
    width: clampRichTextImageWidth(current + step, {
      min: 60,
      max: props.editor.view.dom.clientWidth || Number.POSITIVE_INFINITY,
    }),
  });
}

function handleLabel(side: "left" | "right") {
  return side === "left"
    ? translate("chelone.rich_text.image.resize_left", { _: "Resize image from the left edge" })
    : translate("chelone.rich_text.image.resize_right", { _: "Resize image from the right edge" });
}

function run(action: RichTextImageActionId) {
  if (action === "remove") {
    props.deleteNode();
    return;
  }
  const source = src.value;
  if (!source) return;
  if (action === "view") {
    viewing.value = true;
    return;
  }
  const operation = action === "download"
    ? downloadRichTextImage(source, props.node.attrs.alt ?? "")
    : action === "copyImage"
      ? copyRichTextImage(source)
      : navigator.clipboard.writeText(source);
  void operation.catch(() => {});
}
</script>

<template>
  <NodeViewWrapper
    data-slot="rich-text-image"
    :data-selected="selected || undefined"
    class="group relative my-3 w-fit max-w-full"
  >
    <img
      v-if="src"
      ref="image"
      :src="src"
      :alt="node.attrs.alt ?? ''"
      :title="node.attrs.title ?? undefined"
      :width="dragWidth ?? width"
      draggable
      data-drag-handle
      class="h-auto max-w-full rounded-md"
      :class="selected && 'ring-2 ring-ring'"
      @error="failedSrc = src"
    />
    <div
      v-else
      data-slot="rich-text-image-error"
      class="flex items-center gap-2 rounded-md border border-destructive/50 border-dashed px-3 py-2 text-destructive text-sm"
    >
      <component :is="richTextImageIcon" class="size-4" />
      {{ translate("chelone.rich_text.image.error", { _: "The image could not be loaded" }) }}
    </div>
    <div
      v-if="uploading"
      role="status"
      :aria-label="translate('chelone.rich_text.image.uploading', { _: 'Uploading image' })"
      class="absolute inset-0 flex items-center justify-center rounded-md bg-background/60"
    >
      <component :is="richTextImageSpinnerIcon" class="size-6 animate-spin" />
    </div>
    <div
      data-slot="rich-text-image-actions"
      :class="[
        'absolute top-2 right-2 flex gap-1 rounded-md border bg-background p-1 opacity-0 shadow-sm focus-within:opacity-100 group-hover:opacity-100',
        selected && 'opacity-100',
      ]"
    >
      <Button
        v-for="action in actions"
        :key="action.id"
        variant="ghost"
        size="icon"
        class="size-8"
        :aria-label="translate(action.labelKey, { _: action.defaultLabel })"
        :title="translate(action.labelKey, { _: action.defaultLabel })"
        @click="run(action.id)"
      >
        <component :is="richTextImageActionIcons[action.id]" />
      </Button>
    </div>
    <template v-if="selected && editable && src">
      <button
        v-for="side in (['left', 'right'] as const)"
        :key="side"
        type="button"
        data-slot="rich-text-image-handle"
        :data-side="side"
        :aria-label="handleLabel(side)"
        :class="[
          'absolute top-1/2 h-10 w-2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border border-background bg-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          side === 'left' ? '-left-1' : '-right-1',
        ]"
        @keydown="resize($event, side)"
        @pointerdown="dragHandle($event, side)"
      />
    </template>
    <Teleport to="body">
      <div
        v-if="viewing && src"
        ref="overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="node.attrs.alt || translate('chelone.rich_text.image.view', { _: 'View image' })"
        tabindex="-1"
        data-slot="rich-text-image-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 outline-none"
        @click="viewing = false"
      >
        <Button
          variant="secondary"
          size="icon"
          class="absolute top-4 right-4 size-8"
          :aria-label="translate('chelone.rich_text.image.close', { _: 'Close' })"
          @click="viewing = false"
        >
          <component :is="richTextImageCloseIcon" />
        </Button>
        <img :src="src" :alt="node.attrs.alt ?? ''" class="max-h-full max-w-full object-contain" />
      </div>
    </Teleport>
  </NodeViewWrapper>
</template>
