<script lang="ts">
import type { BlockRegistry } from "@chelone/core";
import type { Editor } from "@tiptap/core";
import type { BlockDefinition } from "./block-nodes";

/** Props for {@link BlockToolbar}. */
export interface BlockToolbarProps {
  editor: Editor;
  registry: BlockRegistry<BlockDefinition>;
}
</script>

<script setup lang="ts">
/**
 * A bar above the document for the block that is selected or holds the caret:
 * configure, duplicate, move and delete. Configure opens a panel under the
 * bar. The Vue twin of `@chelone/react`'s `block-editor/block-toolbar.tsx`.
 */

import { type BlockAttrs, deepEqual } from "@chelone/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, type Transaction } from "@tiptap/pm/state";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import Button from "../ui/button.vue";
import AutoConfigForm from "./auto-config-form.vue";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  SettingsIcon,
  Trash2Icon,
} from "./block-icons";
import { translateBlock } from "./block-nodes";

const props = defineProps<BlockToolbarProps>();

interface SelectedBlock {
  name: string;
  /** Where the block starts in the document. */
  pos: number;
  index: number;
  count: number;
  attrs: BlockAttrs;
}

/** The selected block, else the nearest registered block around the caret. */
function selectedBlock(): SelectedBlock | null {
  const { selection } = props.editor.state;
  const { $from } = selection;
  if (
    selection instanceof NodeSelection &&
    props.registry.get(selection.node.type.name)
  ) {
    return {
      name: selection.node.type.name,
      pos: selection.from,
      index: $from.index(),
      count: $from.parent.childCount,
      attrs: selection.node.attrs,
    };
  }
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (props.registry.get(node.type.name)) {
      return {
        name: node.type.name,
        pos: $from.before(depth),
        index: $from.index(depth - 1),
        count: $from.node(depth - 1).childCount,
        attrs: node.attrs,
      };
    }
  }
  return null;
}

const translate = useTranslate();
const selected = shallowRef(selectedBlock());
// The block the panel is open for, so it does not open itself on another one.
const configFor = ref<string | null>(null);

const refresh = () => {
  const next = selectedBlock();
  if (!deepEqual(next, selected.value)) selected.value = next;
};
props.editor.on("transaction", refresh);
onBeforeUnmount(() => props.editor.off("transaction", refresh));

watch(
  () => selected.value === null,
  (none) => {
    if (none) configFor.value = null;
  },
);

const definition = computed(() =>
  selected.value ? props.registry.get(selected.value.name) : undefined,
);

function runOnBlock(
  pos: number,
  act: (tr: Transaction, block: ProseMirrorNode) => void,
  { focus = true }: { focus?: boolean } = {},
) {
  const { editor } = props;
  const block = editor.state.doc.nodeAt(pos);
  if (!block) return;
  const { tr } = editor.state;
  act(tr, block);
  editor.view.dispatch(tr.scrollIntoView());
  // A config field keeps the focus, or the next keystroke would land in the editor and replace the selected block.
  if (focus) editor.view.focus();
}

function duplicate(pos: number) {
  runOnBlock(pos, (tr, block) => {
    const end = pos + block.nodeSize;
    tr.insert(end, block);
    tr.setSelection(NodeSelection.create(tr.doc, end));
  });
}

function remove(pos: number) {
  runOnBlock(pos, (tr, block) => {
    tr.delete(pos, pos + block.nodeSize);
  });
}

function moveUp(pos: number) {
  runOnBlock(pos, (tr, block) => {
    const before = tr.doc.resolve(pos).nodeBefore;
    if (!before) return;
    const start = pos - before.nodeSize;
    tr.replaceWith(start, pos + block.nodeSize, [block, before]);
    tr.setSelection(NodeSelection.create(tr.doc, start));
  });
}

function moveDown(pos: number) {
  runOnBlock(pos, (tr, block) => {
    const end = pos + block.nodeSize;
    const after = tr.doc.resolve(end).nodeAfter;
    if (!after) return;
    tr.replaceWith(pos, end + after.nodeSize, [after, block]);
    tr.setSelection(NodeSelection.create(tr.doc, pos + after.nodeSize));
  });
}

// Bound to the block at `pos`, so a config that patches late (a file that
// finishes reading) still writes to the block it was opened for.
const patchAt =
  (pos: number) =>
  (attrs: Partial<BlockAttrs>) =>
    runOnBlock(
      pos,
      (tr, block) => {
        tr.setNodeMarkup(pos, undefined, { ...block.attrs, ...attrs });
      },
      { focus: false },
    );
const patch = computed(() => patchAt(selected.value?.pos ?? 0));

const configOpen = computed(
  () => selected.value !== null && configFor.value === selected.value.name,
);

function toggleConfig() {
  configFor.value = configOpen.value ? null : (selected.value?.name ?? null);
}

const actions = computed(() => {
  const current = selected.value;
  if (!current) return [];
  return [
    ...(definition.value?.config === undefined
      ? []
      : [
          {
            id: "configure",
            label: translate("chelone.block_editor.toolbar.configure", {
              _: "Configure",
            }),
            icon: SettingsIcon,
            pressed: configOpen.value,
            run: toggleConfig,
          },
        ]),
    {
      id: "duplicate",
      label: translate("chelone.block_editor.toolbar.duplicate", {
        _: "Duplicate",
      }),
      icon: CopyIcon,
      run: () => duplicate(current.pos),
    },
    {
      id: "move-up",
      label: translate("chelone.block_editor.toolbar.move_up", {
        _: "Move up",
      }),
      icon: ArrowUpIcon,
      disabled: current.index === 0,
      run: () => moveUp(current.pos),
    },
    {
      id: "move-down",
      label: translate("chelone.block_editor.toolbar.move_down", {
        _: "Move down",
      }),
      icon: ArrowDownIcon,
      disabled: current.index === current.count - 1,
      run: () => moveDown(current.pos),
    },
    {
      id: "delete",
      label: translate("chelone.block_editor.toolbar.delete", {
        _: "Delete",
      }),
      icon: Trash2Icon,
      run: () => remove(current.pos),
    },
  ];
});

const config = computed(() => definition.value?.config);
</script>

<template>
  <template v-if="selected && definition">
    <div
      role="toolbar"
      data-slot="block-toolbar"
      :aria-label="translate('chelone.block_editor.toolbar.label', { _: 'Block actions' })"
      class="flex items-center gap-1 border-b p-1"
    >
      <span class="px-2 text-muted-foreground text-xs">
        {{ translateBlock(translate, definition).label }}
      </span>
      <Button
        v-for="action in actions"
        :key="action.id"
        variant="ghost"
        size="icon"
        :aria-label="action.label"
        :aria-pressed="action.pressed"
        :title="action.label"
        :disabled="action.disabled"
        @click="action.run"
      >
        <component :is="action.icon" />
      </Button>
    </div>
    <div v-if="config !== undefined && configOpen" data-slot="block-config" class="border-b p-3">
      <AutoConfigForm
        v-if="config === 'auto'"
        :schema="definition.schema"
        :attrs="selected.attrs"
        v-bind="{ onChange: patch }"
      />
      <component :is="config" v-else v-bind="{ attrs: selected.attrs, onChange: patch }" />
    </div>
  </template>
</template>
