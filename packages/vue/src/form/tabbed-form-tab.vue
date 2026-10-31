<script lang="ts">
/** Props for {@link TabbedFormTab}. */
export interface TabbedFormTabProps {
  /** The tab name, also its form group name: its inputs register into it. */
  name: string;
  /** The tab header label. Defaults to `name`. */
  label?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TabbedFormTab>` — one tab of a `<TabbedForm>`. Its inputs register into a
 * form group named `name`, so its header can aggregate exactly this tab's
 * validity. The panel stays mounted and is `hidden` unless active, so values
 * and validation in other tabs survive a tab switch.
 */
import { computed } from "vue";
import { provideFormGroup } from "./form-groups";
import { useTabbedFormContext } from "./tabbed-form-context";

const props = defineProps<TabbedFormTabProps>();
provideFormGroup(() => props.name);

const { activeTab } = useTabbedFormContext();
const hidden = computed(() => activeTab.value !== props.name);
</script>

<template>
  <div
    role="tabpanel"
    :data-chelone-tab="name"
    :id="`tabpanel-${name}`"
    :aria-labelledby="`tabheader-${name}`"
    :hidden="hidden"
    :aria-hidden="hidden || undefined"
  >
    <slot />
  </div>
</template>
