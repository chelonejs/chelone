<script lang="ts">
/** Props for {@link CancelButton}. */
export interface CancelButtonProps {
  /** Override the auto-translated label. */
  label?: string;
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CancelButton>` — navigates back to the previous page. The Vue twin of
 * `@chelone/react`'s `buttons/cancel-button.tsx`. Wires the adapter
 * `useNavigate(-1)` (the numeric history-delta overload) to a ghost `<Button>`.
 * Commonly paired with `<SaveButton>` in a form toolbar.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useNavigate } from "../../../router";
import Button from "../../ui/button.vue";
import { CircleXIcon } from "./icons";

const props = defineProps<CancelButtonProps>();

const navigate = useNavigate();
const translate = useTranslate();

const label = computed(() =>
  translate("chelone.action.cancel", { _: props.label ?? "Cancel" }),
);

function onClick(): void {
  navigate(-1);
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    :class="props.class"
    :aria-label="label"
    data-slot="cancel-button"
    @click="onClick"
  >
    <CircleXIcon />
    {{ label }}
  </Button>
</template>
