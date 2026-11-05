<script lang="ts">
/** Props for {@link LocalesMenuButton}. */
export interface LocalesMenuButtonProps {
  /**
   * Replaces the languages listed by `useLocales()`. Codes the i18n instance has
   * no catalog for are left out, since choosing one would throw.
   */
  languages?: { locale: string; name: string }[];
  /** Extra CSS class appended to the trigger. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LocalesMenuButton>` — switch the interface language from the app bar. The
 * Vue twin of `@chelone/react`'s `buttons/locales-menu-button.tsx`: a ghost icon
 * button that opens a menu of the available languages, with a check on the
 * current one. Renders nothing with fewer than two languages. Included in the
 * default `<AppBar>` toolbar.
 *
 * The `#icon` slot (the React twin's `icon` prop) replaces the upper-cased
 * current locale code in the trigger.
 *
 * @example
 * <LocalesMenuButton
 *   :languages="[
 *     { locale: 'en', name: 'English' },
 *     { locale: 'fr', name: 'Français' },
 *   ]"
 * />
 */

import { computed, type VNode } from "vue";
import { useCheloneContext } from "../../../context";
import { useLocales } from "../../../i18n/use-locale";
import LocalesMenu from "./locales-menu.vue";

const props = defineProps<LocalesMenuButtonProps>();

defineSlots<{
  /** Shown in the trigger instead of the upper-cased current locale code. */
  icon?: () => VNode[];
}>();

const { i18n } = useCheloneContext();
const defaultLanguages = useLocales();

const languages = computed(() => {
  if (!i18n) return [];
  const registered = new Set(i18n.getLocales());
  return (props.languages ?? defaultLanguages).filter(({ locale }) =>
    registered.has(locale),
  );
});
</script>

<template>
  <LocalesMenu v-if="languages.length > 1" :languages="languages" :class="props.class">
    <template v-if="$slots.icon" #icon><slot name="icon" /></template>
  </LocalesMenu>
</template>
