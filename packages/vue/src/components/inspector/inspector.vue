<script lang="ts">
/** Props for {@link Inspector}. */
export interface InspectorProps {
  /** Classes for the panel. */
  class?: string;
}

</script>

<script setup lang="ts">
/**
 * `<Inspector>` — a floating, draggable panel that edits whichever
 * `<Configurable>` the user picked while configure mode is on. The Vue twin of
 * `@chelone/react`'s `Inspector`. Mount it once, around `<Layout>`, as
 * `<CommandMenu>` is; `<InspectorButton>` turns the mode on. The panel's place
 * is stored under `inspectorPositionKey` when `<Admin>` has a store, and is
 * lost with the panel when it has none.
 *
 * @example
 * <Admin>
 *   <template #layout>
 *     <Inspector>
 *       <Layout><router-view /></Layout>
 *     </Inspector>
 *   </template>
 * </Admin>
 */

import {
  clampInspectorPosition,
  createInspector,
  type InspectorPosition,
  inspectorPositionKey,
  INSPECTOR_KEY_STEP,
  PANEL_WIDTH,
} from "@chelone/core";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  type VNode,
} from "vue";
import { useCheloneContext } from "../../context";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useMicroStore } from "../../store/use-micro-store";
import { useStore } from "../../store/use-store-item";
import { XIcon } from "../admin/buttons/icons";
import Button from "../ui/button.vue";
import {
  type InspectorEditor,
  provideInspector,
  provideInspectorBody,
} from "./inspector-context";

const ARROWS: Record<string, InspectorPosition> = {
  ArrowLeft: { x: -INSPECTOR_KEY_STEP, y: 0 },
  ArrowRight: { x: INSPECTOR_KEY_STEP, y: 0 },
  ArrowUp: { x: 0, y: -INSPECTOR_KEY_STEP },
  ArrowDown: { x: 0, y: INSPECTOR_KEY_STEP },
};

const props = defineProps<InspectorProps>();
defineSlots<{ default?: () => VNode[] }>();

const translate = useTranslate();
const inspector = createInspector<InspectorEditor>();
provideInspector(inspector);
const state = useMicroStore(inspector.store);
// The selected `<Configurable>` teleports its editor in here.
const body = shallowRef<HTMLElement | null>(null);
provideInspectorBody(body);

// Without a store the position lives here, and is lost with the panel.
const local = shallowRef<InspectorPosition>();
const [stored, save] = useCheloneContext().store
  ? useStore<InspectorPosition>(inspectorPositionKey)
  : [
      local,
      (next: InspectorPosition) => {
        local.value = next;
      },
    ];

const viewportWidth = ref(0);
const viewportHeight = ref(0);
const measure = () => {
  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
};
onMounted(() => {
  measure();
  window.addEventListener("resize", measure);
});

const dragged = ref<InspectorPosition | null>(null);

const clamp = (position: InspectorPosition | undefined) =>
  clampInspectorPosition(position, {
    viewportWidth: viewportWidth.value,
    viewportHeight: viewportHeight.value,
    panelWidth: PANEL_WIDTH,
  });
const position = computed(() => clamp(dragged.value ?? stored.value));

let stopDrag: (() => void) | null = null;
onBeforeUnmount(() => {
  window.removeEventListener("resize", measure);
  stopDrag?.();
});

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !(event.target instanceof Element)) return;
  // The Close button is in the handle but is not a grip.
  if (event.target.closest("button")) return;
  // A second press before the first release would orphan the first drag's listeners.
  stopDrag?.();
  const start = { x: event.clientX, y: event.clientY };
  const origin = position.value;
  let last: InspectorPosition | null = null;
  const move = (moveEvent: PointerEvent) => {
    last = clamp({
      x: origin.x + moveEvent.clientX - start.x,
      y: origin.y + moveEvent.clientY - start.y,
    });
    dragged.value = last;
  };
  const end = () => {
    stopDrag?.();
    if (last) save(last);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  stopDrag = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    stopDrag = null;
    dragged.value = null;
  };
}

function onKeyDown(event: KeyboardEvent) {
  // A key pressed on the Close button is its own.
  if (event.target !== event.currentTarget) return;
  const step = ARROWS[event.key];
  if (!step) return;
  event.preventDefault();
  save(
    clamp({
      x: position.value.x + step.x,
      y: position.value.y + step.y,
    }),
  );
}

const title = computed(
  () =>
    state.value.selected?.title ??
    translate("chelone.inspector.title", { _: "Inspector" }),
);
</script>

<template>
  <slot />
  <div
    v-if="state.enabled"
    role="dialog"
    :aria-label="title"
    data-slot="inspector"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${PANEL_WIDTH}px`,
    }"
    :class="
      cn(
        'fixed z-50 flex max-h-[80vh] max-w-[calc(100vw-1rem)] flex-col rounded-lg border bg-popover text-popover-foreground shadow-lg',
        props.class,
      )
    "
  >
    <!-- The header is the grip, and the arrow keys move the panel while it has focus. -->
    <div
      data-slot="inspector-handle"
      tabindex="0"
      role="toolbar"
      :aria-label="title"
      class="flex cursor-grab touch-none select-none items-center gap-2 border-b px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing"
      @pointerdown="onPointerDown"
      @keydown="onKeyDown"
    >
      <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{
        title
      }}</span>
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :aria-label="translate('chelone.action.close', { _: 'Close' })"
        @click="inspector.disable()"
      >
        <XIcon />
      </Button>
    </div>
    <div
      ref="body"
      data-slot="inspector-body"
      class="flex flex-col gap-3 overflow-auto p-3"
    >
      <p v-if="!state.selected" class="text-sm text-muted-foreground">
        {{
          translate("chelone.inspector.empty", {
            _: "Pick an outlined element to configure it",
          })
        }}
      </p>
    </div>
  </div>
</template>
