<script lang="ts">
/**
 * The page below is in French, which has none of its three strings. Each one the
 * page asks for lands in the panel, and what you type is what Export copies. The
 * panel is fixed to the viewport by default; `static` keeps it in the preview.
 *
 * `<I18nKeyEditor>` reads the locale off the i18n in the context, so the demo
 * provides its own over the harness's. A component cannot read what it provides,
 * so the strings live in a child that asks for them through `useTranslate`, the
 * way a page does.
 */

import { createI18n, createMissingKeyStore, defineMessages } from "@chelone/core";
import { useTranslate } from "@chelone/vue";
import { defineComponent, h } from "vue";

const store = createMissingKeyStore();
const i18n = createI18n({
  locale: "fr",
  messages: {
    en: defineMessages({}),
    fr: defineMessages({}),
  },
  onMissingKey: store.record,
});

const Strings = defineComponent({
  setup() {
    const translate = useTranslate();
    return () =>
      h("ul", { class: "list-disc pl-5 text-sm" }, [
        h("li", translate("shop.title", { _: "Shop" })),
        h("li", translate("shop.cart", { _: "Your cart" })),
        h("li", translate("shop.checkout", { _: "Check out" })),
      ]);
  },
});
</script>

<script setup lang="ts">
import { I18nKeyEditor, provideCheloneContext, useCheloneContext } from "@chelone/vue";

const context = useCheloneContext();
provideCheloneContext({ ...context, i18n });
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <Strings />
    <I18nKeyEditor :store="store" class="static w-full max-w-md" />
  </div>
</template>
