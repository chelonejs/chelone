<script lang="ts">
/** Props for {@link NotFound}. */
export interface NotFoundProps {
  /** Overrides the page title shown in the app bar. Translated if a key. */
  title?: string;
  /** Extra class names applied to the wrapper `div`. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<NotFound>` — the page for an unknown URL, meant for `<Admin>`'s `#catchAll`
 * slot. The Vue twin of `@chelone/react`'s `feedback/not-found.tsx`. Checks
 * authentication first, so a signed-out visitor is sent to login before seeing
 * it; the back button goes through the router adapter's `useNavigate`, so a
 * basename and a non-browser router are respected. The `#icon` slot replaces
 * the default search glyph.
 *
 * @example
 * <Admin :data-provider="dp">
 *   <template #catchAll><NotFound /></template>
 * </Admin>
 */

import { computed, type VNode } from "vue";
import { useAuthenticated } from "../../../admin/auth-gate";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useNavigate } from "../../../router";
import Button from "../../ui/button.vue";
import Title from "../layout/title.vue";
import { SearchXIcon } from "./icons";
import Loading from "./loading.vue";

const props = defineProps<NotFoundProps>();

defineSlots<{
  /** Replaces the default search-x glyph. */
  icon?: () => VNode[];
}>();

// With no authProvider the gate is frozen authenticated, so an app with no
// auth shows its 404 page straight away.
const { isPending } = useAuthenticated();
const translate = useTranslate();
const navigate = useNavigate();

const heading = computed(() =>
  translate("chelone.page.not_found", { _: "Not Found" }),
);
</script>

<template>
  <Loading v-if="isPending" />
  <div
    v-else
    :class="cn('flex flex-col items-center md:p-16 gap-5', props.class)"
  >
    <Title :title="props.title" :default-title="heading" />
    <h1 class="flex items-center text-3xl mt-5 mb-5 gap-3">
      <slot name="icon">
        <SearchXIcon class="w-[2em] h-[2em]" />
      </slot>
      {{ heading }}
    </h1>
    <p>
      {{
        translate("chelone.message.not_found", {
          _: "The page you requested cannot be found.",
        })
      }}
    </p>
    <div class="mt-8">
      <Button type="button" @click="navigate(-1)">
        {{ translate("chelone.action.back", { _: "Back" }) }}
      </Button>
    </div>
  </div>
</template>
