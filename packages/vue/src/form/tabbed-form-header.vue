<script lang="ts">
/** Props for {@link TabbedFormHeader}. */
export interface TabbedFormHeaderProps {
  /** The tab name, also the form group its validity dot reads. */
  name: string;
  label: string;
}
</script>

<script setup lang="ts">
/**
 * `<TabbedFormHeader>` — the clickable header of one tab, with an error dot
 * while any field in that tab is invalid. Rendered by `<TabbedForm>`.
 */
import { computed } from "vue";
import { useFormGroup } from "./form-groups";
import { useTabbedFormContext } from "./tabbed-form-context";

const props = defineProps<TabbedFormHeaderProps>();

const { activeTab, goToTab } = useTabbedFormContext();
const group = useFormGroup(() => props.name);
const active = computed(() => activeTab.value === props.name);
</script>

<template>
  <button
    type="button"
    role="tab"
    :id="`tabheader-${name}`"
    :data-chelone-tab-header="name"
    :aria-selected="active"
    :aria-controls="`tabpanel-${name}`"
    :data-active="active || undefined"
    @click="goToTab(name)"
  >
    {{ label }}
    <span v-if="!group.isValid" :data-chelone-tab-error="name" aria-hidden="true">
      {{ " •" }}
    </span>
  </button>
</template>
