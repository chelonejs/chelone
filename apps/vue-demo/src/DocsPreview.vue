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

import {
  type Component,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
} from "vue";
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

// The docs page sizes this frame to the demo: a fixed height clipped a table or
// a whole admin shell. Report the demo's height whenever it changes.
let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  if (window.parent === window) return;
  const report = () => {
    window.parent.postMessage(
      {
        type: "chelone-docs-demo-height",
        height: document.body.scrollHeight,
      },
      window.location.origin,
    );
  };
  resizeObserver = new ResizeObserver(report);
  resizeObserver.observe(document.body);
  void nextTick(report);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <!-- `px-1` absorbs the 4px a `<DataTable>` header sort button pulls past its
       own cell (`-mx-3` over the head's `px-2`, so its label lines up with the
       cell text). A React demo overhangs into the preview panel's padding; an
       iframe clips at its own edge, which cut the button's hover fill. -->
  <div v-if="demo" class="px-1">
    <PreviewProvider :mode="demo.mode ?? 'view'">
      <component :is="demo.default" />
    </PreviewProvider>
  </div>
</template>
