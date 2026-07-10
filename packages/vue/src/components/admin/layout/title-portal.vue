<script lang="ts">
/** Props for {@link TitlePortal}. */
export interface TitlePortalProps {
  /** Extra class appended to the portal slot element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TitlePortal>` — the render target for a page `<Title>`, placed in the app
 * bar. The Vue twin of `@chelone/react`'s `layout/title-portal.tsx` (no core
 * seam — a pure DOM slot). The default `<Layout>`'s `<AppBar>` includes it; a
 * page `<Title>` teleports into the element with this id.
 */

import { cn } from "../../../lib/utils";
import { TITLE_PORTAL_ID } from "./title-portal-id";

const props = defineProps<TitlePortalProps>();
</script>

<template>
  <div
    :id="TITLE_PORTAL_ID"
    :class="cn('flex min-w-0 flex-1 items-center', props.class)"
    data-slot="title-portal"
  />
</template>
