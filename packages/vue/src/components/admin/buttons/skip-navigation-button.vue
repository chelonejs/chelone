<script lang="ts">
/** Props for {@link SkipNavigationButton}. */
export interface SkipNavigationButtonProps {
  /** An i18n key (contains a dot) or literal text. Default `chelone.navigation.skip_nav`. */
  label?: string;
  /** Extra CSS class appended to the button. */
  class?: string;
}

// Bundler-replaced dev/prod flag (mirrors `feedback/error.vue`). `@chelone/vue`
// ships no `@types/node`; a minimal ambient declaration keeps it typed.
declare const process: { env?: { NODE_ENV?: string } } | undefined;
</script>

<script setup lang="ts">
/**
 * `<SkipNavigationButton>` — an off-screen button that appears on focus and
 * moves keyboard focus to the page content (`#main-content`), past the menu.
 * The Vue twin of `@chelone/react`'s `buttons/skip-navigation-button.tsx`.
 *
 * Vue divergence: the default slot replaces the label text, where the React twin
 * takes a node as `label`.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";

const props = withDefaults(defineProps<SkipNavigationButtonProps>(), {
  label: "chelone.navigation.skip_nav",
});

const translate = useTranslate();

const text = computed(() =>
  props.label.includes(".")
    ? translate(props.label, { _: "Skip to content" })
    : props.label,
);

function skip(): void {
  if (typeof document === "undefined") return;
  const element = document.getElementById("main-content");
  if (!element) {
    if (
      (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
      "production"
    ) {
      console.warn(
        "No element with id 'main-content' found. To use the SkipNavigationButton, make sure your main content element has the id 'main-content'.",
      );
    }
    return;
  }
  // Focus and blur the target so the next Tab lands on the first control in it.
  element.setAttribute("tabindex", "-1");
  element.focus();
  element.blur();
  element.removeAttribute("tabindex");
}
</script>

<template>
  <Button
    type="button"
    class="fixed left-4 -top-24 z-5000 transition-all focus:top-4 duration-300 ease-in-out"
    :class="props.class"
    data-slot="skip-navigation-button"
    @click="skip"
  >
    <slot>{{ text }}</slot>
  </Button>
</template>
