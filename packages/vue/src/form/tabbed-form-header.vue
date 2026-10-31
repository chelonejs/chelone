<script lang="ts">
/** Props for {@link TabbedFormHeader}. */
export interface TabbedFormHeaderProps {
  /** The tab name, also the form group its validity dot reads. */
  name: string;
  label: string;
  /** The tab's link target when the tabs are URL-synced; omit for a button. */
  href?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TabbedFormHeader>` — the clickable header of one tab, with an error dot
 * while any field in that tab is invalid. Rendered by `<TabbedForm>`: a link
 * with an `href`, so it can be opened in a new tab, else a button.
 */
import { computed } from "vue";
import { useFormGroup } from "./form-groups";
import { useTabbedFormContext } from "./tabbed-form-context";

const props = defineProps<TabbedFormHeaderProps>();

const { activeTab, goToTab } = useTabbedFormContext();
const group = useFormGroup(() => props.name);
const active = computed(() => activeTab.value === props.name);

/** A plain primary click navigates in place; anything else is the browser's. */
function onClick(event: MouseEvent) {
  if (props.href !== undefined) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
  }
  goToTab(props.name);
}
</script>

<template>
  <component
    :is="href === undefined ? 'button' : 'a'"
    :type="href === undefined ? 'button' : undefined"
    :href="href"
    role="tab"
    :id="`tabheader-${name}`"
    :data-chelone-tab-header="name"
    :aria-selected="active"
    :aria-controls="`tabpanel-${name}`"
    :data-active="active || undefined"
    @click="onClick"
  >
    {{ label }}
    <span v-if="!group.isValid" :data-chelone-tab-error="name" aria-hidden="true">
      {{ " •" }}
    </span>
  </component>
</template>
