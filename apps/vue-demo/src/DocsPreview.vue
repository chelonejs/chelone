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
  <!-- `px-1` absorbs the 4px a `<DataTable>` header sort button pulls past its
       own cell (`-mx-3` over the head's `px-2`, so its label lines up with the
       cell text). A React demo overhangs into the preview panel's padding; an
       iframe clips at its own edge, which cut the button's hover fill.

       The inner `flow-root` keeps the demo's own margins inside its box: the
       page fits the frame to this document's body, and a margin that collapsed
       out of it would land outside the fitted height.

       `not-prose` is the class the website's preview panel puts on a React
       demo, so a showcase `see` written against the React docs page (many open
       with `.not-prose`) finds the same component in this frame. -->
  <div class="not-prose px-1">
    <div class="flow-root">
      <PreviewProvider v-if="demo" :mode="demo.mode ?? 'view'">
        <component :is="demo.default" />
      </PreviewProvider>
    </div>
  </div>
</template>

<style scoped>
/* The frame is laid out at desktop width and fitted to this document, and its
   height floor sits on the docs panel, not here (see `ComponentPreview`): a
   height floor inside the frame is zoomed with it, and a short demo would sit at
   the top of a band. So the panel centres a short demo, and this only centres
   across the frame: auto margins for a demo that caps its own width, which do
   nothing to one that fills the frame, and `text-align` for a bare field, which
   renders inline (a `<BadgeField>` is a span), reset inside every demo so a
   table's cells stay left-aligned. */
.flow-root {
  text-align: center;
}

.flow-root > :deep(*) {
  margin-inline: auto;
  text-align: start;
}
</style>
