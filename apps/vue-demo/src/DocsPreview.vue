<script setup lang="ts">
/**
 * `<DocsPreview>` — the page a docs page embeds as an iframe, at
 * `/vue-demo/docs-preview/<slug>/<demo>`. The website has no Vue compiler, so it
 * cannot mount a Vue demo itself; this app can, and it already has Vue's styles.
 *
 * The demo is found by globbing the docs content folder, where it sits beside
 * its React twin as `<slug>/demos/<demo>.vue`. A URL that matches no demo
 * renders nothing.
 *
 * The frame has no height of its own: the demo reports its own to the parent
 * page (see `ComponentPreview`), which sizes the frame to it. A fixed height
 * would clip a tall demo (an approval queue) and leave dead space under a short
 * one.
 */

import {
  computed,
  type Component,
  onMounted,
  onScopeDispose,
  ref,
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

// The frame is sized to the demo, so the UA body margin would inset the demo 8px
// past the padding the docs preview panel already gives it.
document.body.style.margin = "0";

const mode = computed<PreviewMode>(() => demo.value?.mode ?? "view");
const content = ref<HTMLElement>();

// The html box is the demo's own height, margins included (the wrapper's
// `offsetHeight` is not: `<Create>` carries an 8px margin above and below).
function reportHeight(): void {
  parent.postMessage(
    {
      type: "chelone-docs-preview-height",
      height: document.documentElement.getBoundingClientRect().height,
    },
    "*",
  );
}

// The demo mounts and fetches after this page does, so the height is re-read on
// every resize instead of once on load.
let resize: ResizeObserver | undefined;
onMounted(() => {
  resize = new ResizeObserver(reportHeight);
  const el = content.value;
  if (el) resize.observe(el);
});
onScopeDispose(() => resize?.disconnect());
</script>

<template>
  <!-- An `input` demo fills the frame as it fills the React panel's block row; a
       view or record demo is centered, as the React panel centers it. -->
  <div ref="content" :class="mode === 'input' ? 'block' : 'flex justify-center'">
    <PreviewProvider v-if="demo" :mode="mode">
      <component :is="demo.default" />
    </PreviewProvider>
  </div>
</template>
