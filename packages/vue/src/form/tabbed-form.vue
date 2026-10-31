<script lang="ts">
import type { OptionalSaveFormProps } from "./form-scope";

/**
 * Props for {@link TabbedForm}. With `save` the form builds its own form and
 * takes every form option; without it the form drives the one of the view above
 * it (`<Edit>`, `<Create>`), which takes the other options.
 */
export type TabbedFormProps<TFormData> = OptionalSaveFormProps<TFormData> & {
  /** Tabs held locally. The URL-synced mode is not built yet. */
  syncWithLocation?: false;
};
</script>

<script setup lang="ts" generic="TFormData">
/**
 * `<TabbedForm>` — one form split into tabs, the local-tab mode of
 * `@chelone/react`'s `tabbed-form.tsx`. Tabs are the `<TabbedFormTab>` vnodes of
 * the default slot, in order. Every tab stays mounted (inactive ones are
 * `hidden`) so cross-tab validation works and one submit collects the whole
 * form. Per-tab validity reuses form groups: each tab is a group, and its
 * header reads `useFormGroup(name)` for the error dot.
 */
import { computed, Fragment, ref, shallowRef, useSlots, type VNode } from "vue";
import { useFormScope } from "./form-scope";
import { provideFormGroups } from "./form-groups";
import TabbedFormHeader from "./tabbed-form-header.vue";
import TabbedFormTab from "./tabbed-form-tab.vue";
import { provideTabbedForm } from "./tabbed-form-context";

const props = withDefaults(defineProps<TabbedFormProps<TFormData>>(), {
  resetOnSuccess: true,
  syncWithLocation: false,
});
const slots = useSlots();

const submit = useFormScope<TFormData>("TabbedForm", props);
provideFormGroups();

interface TabDescriptor {
  name: string;
  label: string;
}

/** Flatten fragments so a `v-for` of tabs is read like written-out ones. */
function collectTabs(nodes: VNode[]): TabDescriptor[] {
  const tabs: TabDescriptor[] = [];
  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) {
      tabs.push(...collectTabs(node.children as VNode[]));
    } else if (node.type === TabbedFormTab) {
      const name = String(node.props?.name);
      tabs.push({ name, label: String(node.props?.label ?? name) });
    }
  }
  return tabs;
}

/** Read from the slot on every render: a slot call outside render warns. */
const tabs = shallowRef<TabDescriptor[]>([]);
function readTabs(): TabDescriptor[] {
  const next = collectTabs(slots.default?.() ?? []);
  const prev = tabs.value;
  const same =
    next.length === prev.length &&
    next.every((tab, i) => tab.name === prev[i]?.name);
  if (!same) tabs.value = next;
  return next;
}

const selected = ref<string>();
const activeTab = computed(() => {
  const names = tabs.value.map((tab) => tab.name);
  const wanted = selected.value;
  return wanted !== undefined && names.includes(wanted)
    ? wanted
    : (names[0] ?? "");
});

provideTabbedForm({
  activeTab,
  syncWithLocation: false,
  goToTab(name) {
    if (tabs.value.some((tab) => tab.name === name)) selected.value = name;
  },
  submit,
});
</script>

<template>
  <div role="tablist" data-chelone-tablist>
    <TabbedFormHeader
      v-for="tab in readTabs()"
      :key="tab.name"
      :name="tab.name"
      :label="tab.label"
    />
  </div>
  <slot />
</template>
