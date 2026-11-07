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

/**
 * Tell the embedding docs page how tall the demo is, named by the demo id the
 * page asked for, so the iframe fits it: a `<List>` demo would otherwise scroll
 * inside a fixed-height iframe, and a one-line field would sit at the top of a
 * tall one instead of centring in the panel beside it.
 */
const sizes = new ResizeObserver((entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { height } = entry.contentRect;
  if (height > 0) {
    window.parent.postMessage(
      { cheloneDocsPreview: id, height: Math.ceil(height) },
      "*",
    );
  }
});
sizes.observe(document.body);
</script>

<template>
  <!-- `flow-root` keeps the demo's own margins inside its box, so the height
       reported above is the whole demo and none of it is cut off. -->
  <div class="flow-root">
    <PreviewProvider v-if="demo" :mode="demo.mode ?? 'view'">
      <component :is="demo.default" />
    </PreviewProvider>
  </div>
</template>
