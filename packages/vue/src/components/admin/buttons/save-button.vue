<script setup lang="ts">
/**
 * `<SaveButton>` — submits the ambient CRUD form, the Vue analog of
 * `@chelone/react`'s `buttons/save-button.tsx`. Chelone views render no native
 * `<form>` element, so this reads the ambient `submit` off the form context
 * (mounted by `<Edit>`/`<Create>` via `useForm`'s provider) and invokes it on
 * click. Disabled state derives from the reactive form-store slices
 * (`isSubmitting` / `isValidating` / `canSubmit`), the React twin's
 * `useSelector(form.store, …)` mapped to a Vue `shallowRef` bridge over the
 * form-core store (a plain read — no mount, the form is already mounted).
 */

import { computed, onScopeDispose, shallowRef } from "vue";
import { useCheloneFormContext } from "../../../form/form-context";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";

const props = withDefaults(
  defineProps<{
    label?: string;
    alwaysEnable?: boolean;
    disabled?: boolean;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
    class?: string;
  }>(),
  { label: "chelone.action.save", alwaysEnable: false, variant: "default" },
);

const { form, submit } = useCheloneFormContext();
const translate = useTranslate();

// Reactive bridge over the form-core store (already mounted by useForm): read
// the submit gate slices without re-mounting anything.
const state = shallowRef(form.store.state);
const subscription = form.store.subscribe(() => {
  state.value = form.store.state;
});
onScopeDispose(() => {
  const unsub = subscription as unknown as
    | (() => void)
    | { unsubscribe: () => void };
  if (typeof unsub === "function") unsub();
  else unsub.unsubscribe();
});

const saving = computed(() => state.value.isSubmitting);
const disabled = computed(() => {
  if (props.alwaysEnable) return props.disabled ?? false;
  return (
    (props.disabled ?? false) ||
    state.value.isValidating ||
    state.value.isSubmitting ||
    !state.value.canSubmit
  );
});

const displayedLabel = computed(() => translate(props.label));

async function onClick() {
  if (submit) await submit();
  else await form.handleSubmit();
}
</script>

<template>
  <Button
    type="submit"
    :variant="variant"
    :disabled="disabled"
    :class="props.class"
    :aria-label="displayedLabel"
    data-slot="save-button"
    @click="onClick"
  >
    <span v-if="saving" data-slot="save-spinner" class="animate-spin">…</span>
    {{ displayedLabel }}
  </Button>
</template>
