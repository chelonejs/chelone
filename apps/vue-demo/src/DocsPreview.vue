<script setup lang="ts">
/**
 * `<DocsPreview>` — the page a docs page embeds as an iframe, at
 * `/vue-demo/docs-preview/<slug>/<demo>`. The website has no Vue compiler, so it
 * cannot mount a Vue demo itself; this app can, and it already has Vue's styles.
 *
 * The demo is found by globbing the docs content folder, where it sits beside
 * its React twin as `<slug>/demos/<demo>.vue`. A URL that matches no demo
 * renders nothing.
 */

import { type Component, shallowRef } from "vue";
import PreviewProvider, { type PreviewMode } from "./PreviewProvider.vue";

interface VueDemoModule {
  default: Component;
  mode?: PreviewMode;
}

const demos = import.meta.glob<VueDemoModule>(
  "../../website/src/docs/content/**/demos/*.vue",
);

const prefix = `${import.meta.env.BASE_URL}docs-preview/`;
const { pathname } = window.location;
const id = pathname.startsWith(prefix)
  ? decodeURIComponent(pathname.slice(prefix.length)).replace(/\/+$/, "")
  : "";
const slash = id.lastIndexOf("/");
const load =
  slash > 0
    ? demos[
        `../../website/src/docs/content/${id.slice(0, slash)}/demos/${id.slice(slash + 1)}.vue`
      ]
    : undefined;

const demo = shallowRef<VueDemoModule>();
void load?.().then((loaded) => {
  demo.value = loaded;
});
</script>

<template>
  <!-- `flow-root` keeps the demo's own margins inside its box: the page fits
       the iframe to this document's body, and a margin that collapsed out of it
       would land outside the fitted height. -->
  <div class="flow-root">
    <PreviewProvider v-if="demo" :mode="demo.mode ?? 'view'">
      <component :is="demo.default" />
    </PreviewProvider>
  </div>
</template>

<style scoped>
/* The frame is as wide as the panel, so a bare field would sit at its left
   edge where the React panel centres it. Auto margins centre a demo that caps
   its own width and do nothing to one that fills the frame; `text-align`
   centres a bare field, which renders inline (a `<BadgeField>` is a span), and
   is reset inside every demo so a table's cells stay left-aligned. */
.flow-root {
  text-align: center;
}

.flow-root > :deep(*) {
  margin-inline: auto;
  text-align: start;
}
</style>
