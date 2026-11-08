<script lang="ts">
/**
 * `<LocalesMenuButton>` switches the prompt and button label between English and
 * French. The button reads the i18n off the context, so the demo provides its
 * own over the harness's, and the prompt beside it is a child that reads it
 * through `useTranslate` and re-renders when the locale changes.
 */

import { createI18n, defineMessages } from "@chelone/core";
import { useTranslate } from "@chelone/vue";
import { defineComponent, h } from "vue";

const i18n = createI18n({
  locale: "en",
  messages: {
    en: defineMessages({ "chelone.action.change_locale": "Change locale" }),
    fr: defineMessages({ "chelone.action.change_locale": "Changer de langue" }),
  },
});

const Prompt = defineComponent({
  setup() {
    const translate = useTranslate();
    return () => h("span", translate("chelone.action.change_locale"));
  },
});
</script>

<script setup lang="ts">
import { LocalesMenuButton, provideCheloneContext, useCheloneContext } from "@chelone/vue";

const context = useCheloneContext();
provideCheloneContext({ ...context, i18n });
</script>

<template>
  <div class="flex items-center gap-2">
    <Prompt />
    <LocalesMenuButton />
  </div>
</template>
