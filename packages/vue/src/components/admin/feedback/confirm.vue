<script lang="ts">
import type { TranslateParamValues } from "@chelone/core";

/** Props for {@link Confirm}. */
export interface ConfirmProps {
  /** Whether the dialog is open. Default `false`. */
  isOpen?: boolean;
  /** Disables both buttons while a confirm action is in flight. */
  loading?: boolean;
  /** Dialog title (i18n key or literal — translated with a `_` fallback). */
  title: string;
  /** Dialog body copy (i18n key or literal — translated with a `_` fallback). */
  content?: string;
  /** Cancel-button label key. Default `"chelone.action.cancel"`. */
  cancel?: string;
  /** Confirm-button label key. Default `"chelone.action.confirm"`. */
  confirm?: string;
  /** `"warning"` tints the confirm button destructive. Default `"primary"`. */
  confirmColor?: "primary" | "warning";
  /** Interpolation params merged into the title/content translation (e.g. `smart_count`). */
  translateOptions?: TranslateParamValues;
  /** Extra CSS class appended to the dialog panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Confirm>` — a generic confirmation dialog for destructive actions. The Vue
 * twin of `@chelone/react`'s `feedback/confirm.tsx`; gates a delete behind an
 * explicit confirmation (chelone has no undoable notification stack, so
 * pessimistic-with-confirm is the default delete UX).
 *
 * DELIBERATE DIVERGENCE: the React twin composes radix's `<Dialog>`; the Vue
 * package ships NO reka-ui (its `ui/` primitives are hand-rolled + dependency-
 * free — see `ui/dropdown-menu`'s "no portal" note). So this renders a
 * dependency-free modal INLINE (no `<Teleport>`): a fixed backdrop + centered
 * `role="alertdialog"` panel, closing on Escape or backdrop click. Labels flow
 * through `translate(key, { _: fallback })`.
 *
 * The default slot replaces `content` for a body that is not a message key,
 * since `content` is translated. React takes a node for `content`; this is the
 * Vue way to pass one.
 *
 * Emits `confirm` (user accepted) and `close` (user cancelled / dismissed) — the
 * Vue idiom for the React twin's `onConfirm` / `onClose` callbacks.
 */

import { computed, onBeforeUnmount, watch } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { buttonVariants } from "../../ui/button-variants";
import { AlertCircleIcon, CheckCircleIcon } from "./icons";

const props = withDefaults(defineProps<ConfirmProps>(), {
  isOpen: false,
  cancel: "chelone.action.cancel",
  confirm: "chelone.action.confirm",
  confirmColor: "primary",
});

const emit = defineEmits<{
  (event: "confirm"): void;
  (event: "close"): void;
}>();

const translate = useTranslate();

const titleText = computed(() =>
  translate(props.title, { _: props.title, ...props.translateOptions }),
);
const contentText = computed(() =>
  props.content !== undefined
    ? translate(props.content, {
        _: props.content,
        ...props.translateOptions,
      })
    : undefined,
);
const panelClass = computed(() =>
  cn(
    "relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg",
    props.class,
  ),
);
const cancelClass = computed(() =>
  buttonVariants({ variant: "ghost", class: "gap-1" }),
);
const confirmClass = computed(() =>
  buttonVariants({
    variant: props.confirmColor === "warning" ? "destructive" : "default",
    class: "gap-1",
  }),
);

function onClose(): void {
  emit("close");
}
function onConfirm(): void {
  emit("confirm");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") onClose();
}

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document === "undefined") return;
    if (open) document.addEventListener("keydown", onKeydown);
    else document.removeEventListener("keydown", onKeydown);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined")
    document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    data-slot="confirm"
  >
    <div
      class="absolute inset-0 bg-black/50"
      data-slot="confirm-overlay"
      @click="onClose"
    />
    <div
      role="alertdialog"
      aria-modal="true"
      :class="panelClass"
      @click.stop
    >
      <div class="flex flex-col gap-2 text-center sm:text-left">
        <h2 class="text-lg font-semibold" data-slot="confirm-title">
          {{ titleText }}
        </h2>
        <!-- The default slot holds content that must not be translated, such as a tool call's arguments. -->
        <div
          v-if="$slots.default"
          class="text-sm text-muted-foreground"
          data-slot="confirm-content"
        >
          <slot />
        </div>
        <p
          v-else-if="contentText"
          class="text-sm text-muted-foreground"
          data-slot="confirm-content"
        >
          {{ contentText }}
        </p>
      </div>
      <div
        class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          :class="cancelClass"
          :disabled="loading"
          data-slot="confirm-cancel"
          @click="onClose"
        >
          <AlertCircleIcon class="size-5" />
          {{ translate(cancel, { _: cancel }) }}
        </button>
        <button
          type="button"
          :class="confirmClass"
          :disabled="loading"
          data-slot="confirm-accept"
          @click="onConfirm"
        >
          <CheckCircleIcon class="size-5" />
          {{ translate(confirm, { _: confirm }) }}
        </button>
      </div>
    </div>
  </div>
</template>
