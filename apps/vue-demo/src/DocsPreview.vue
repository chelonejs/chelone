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
  <!-- The frame lays the demo out where the docs page puts its React twin:
       centered for a view or a bare field, full width for a bare input (see
       `ComponentPreview`'s preview panel). -->
  <div v-if="demo" :class="demo.mode === 'input' ? 'block' : 'flex justify-center'">
    <!-- `min-w-0`: a flex item may not shrink below its min-content size, so a
         wide table pushed the frame's body sideways instead of scrolling inside
         the table. The React panel wraps its demo the same way. -->
    <div class="min-w-0 w-full">
      <PreviewProvider :mode="demo.mode ?? 'view'">
        <component :is="demo.default" />
      </PreviewProvider>
    </div>
  </div>
</template>
