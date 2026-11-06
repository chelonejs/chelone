<script lang="ts">
import type { BlockDefinition } from "./block-nodes";

/** Props for {@link BlockPicker}. */
export interface BlockPickerProps {
  blocks: readonly BlockDefinition[];
  query: string;
  /** Shows a search box that edits `query`. The slash menu has none: the editor holds the text. */
  searchable?: boolean;
  anchor: () => DOMRect | null;
  /** The picker puts its handler for the editor's arrow and Enter keys here. */
  keyHandler: { current: ((event: KeyboardEvent) => boolean) | null };
}
</script>

<script setup lang="ts">
/**
 * The block menu, placed at a client rect, listing the blocks that match
 * `query` by group. Built on the `Command` family with its own filter off:
 * `matchBlocks` decides what shows.
 */

import { matchBlocks } from "@chelone/core";
import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  computed,
  ref,
} from "vue";
import { useTranslate } from "../../i18n/use-translate";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  useCommand,
} from "../ui/command";
import { translateBlock } from "./block-nodes";

const props = withDefaults(defineProps<BlockPickerProps>(), {
  searchable: false,
});
const emit = defineEmits<{
  "update:query": [query: string];
  select: [block: BlockDefinition];
  close: [];
}>();

const translate = useTranslate();
const root = ref<HTMLElement | null>(null);

// Searching reads the words the user sees, so it matches the translated copy.
const matches = computed(() =>
  matchBlocks(
    props.blocks.map((block) => translateBlock(translate, block)),
    props.query,
  ),
);
const groups = computed(() => {
  const byGroup = new Map<string, BlockDefinition[]>();
  for (const block of matches.value) {
    byGroup.set(block.group, [...(byGroup.get(block.group) ?? []), block]);
  }
  return [...byGroup];
});

// Lives inside `<Command>`, the only place its context reaches, to steer the
// list from the editor's keys.
const KeyBridge = defineComponent({
  setup() {
    const command = useCommand();
    props.keyHandler.current = (event) => {
      if (event.key === "ArrowDown") command.move("next");
      else if (event.key === "ArrowUp") command.move("prev");
      else if (event.key === "Enter") {
        if (command.activeId.value === null) return false;
        command.selectActive();
      } else return false;
      return true;
    };
    onBeforeUnmount(() => {
      props.keyHandler.current = null;
    });
    return () => null;
  },
});

function closeOnOutsidePointer(event: PointerEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (root.value?.contains(target)) return;
  // The add button toggles the picker itself.
  if (target.closest('[data-slot="block-editor-add"]')) return;
  emit("close");
}
onMounted(() => document.addEventListener("pointerdown", closeOnOutsidePointer));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", closeOnOutsidePointer),
);

// The slash menu must not take focus from the editor that holds its query.
function keepEditorFocus(event: MouseEvent) {
  if (!props.searchable) event.preventDefault();
}

const position = computed(() => {
  const rect = props.anchor();
  return {
    position: "fixed" as const,
    left: `${rect?.left ?? 0}px`,
    top: `${(rect?.bottom ?? 0) + 4}px`,
    zIndex: 50,
  };
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      data-slot="block-editor-picker"
      class="w-72 rounded-md border bg-popover shadow-md"
      :style="position"
      @mousedown="keepEditorFocus"
      @keydown.escape="emit('close')"
    >
      <Command
        :should-filter="false"
        :model-value="query"
        @update:model-value="emit('update:query', $event)"
      >
        <KeyBridge />
        <CommandInput
          v-if="searchable"
          autofocus
          :placeholder="translate('chelone.block_editor.search', { _: 'Search blocks' })"
        />
        <CommandList>
          <CommandEmpty>
            {{ translate("chelone.block_editor.no_blocks", { _: "No blocks found" }) }}
          </CommandEmpty>
          <CommandGroup
            v-for="[group, members] in groups"
            :key="group"
            :heading="group"
          >
            <CommandItem
              v-for="block in members"
              :key="block.name"
              :value="block.name"
              @select="emit('select', block)"
            >
              <component :is="block.icon" v-if="block.icon" class="size-4" />
              <span class="flex flex-col">
                <span>{{ block.label }}</span>
                <span v-if="block.description" class="text-muted-foreground text-xs">
                  {{ block.description }}
                </span>
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  </Teleport>
</template>
