<script lang="ts">
import type { FilterPayload, SortPayload } from "@chelone/core";

/** Props for {@link Count}. */
export interface CountProps {
  /** The resource to count. Defaults to the ambient resource. */
  resource?: string;
  filter?: FilterPayload;
  sort?: SortPayload;
  /** Link the count to the resource's list, filtered by `filter`. */
  link?: boolean;
  /** Milliseconds a pending count waits before showing a spinner. Default 1000. */
  timeout?: number;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Count>` — how many records of a resource match `filter`, read from the
 * `total` of a one-row `getList` page. The Vue twin of `@chelone/react`'s
 * `list/count.tsx`. Renders nothing when the provider returns no `total`; a `0`
 * total renders as `0`. Throws when no resource is in scope.
 *
 * @example
 * <Count resource="posts" :filter="{ status: 'draft' }" link />
 */

import { serializeListParams } from "@chelone/core";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useGetList } from "../../../data/queries";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";
import { CircleXIcon } from "../buttons/icons";
import CountSpinner from "./count-spinner.vue";

const props = withDefaults(defineProps<CountProps>(), { timeout: 1000 });

const ambientResource = useResourceContext();
if (!props.resource && !ambientResource) {
  throw new Error(
    "<Count> components should be used inside a <Resource> component or provided the resource prop.",
  );
}

const translate = useTranslate();
const createPath = useCreatePath();
// Read through `props` so a bound `resource` that changes refetches and relinks.
const resource = computed(() => props.resource ?? ambientResource ?? "");
const { data, isPending, error } = useGetList(
  resource,
  computed(() => ({
    filter: props.filter,
    sort: props.sort,
    pagination: { page: 1, perPage: 1 },
  })),
);

const to = computed(
  () =>
    `${createPath({ type: "list", resource: resource.value })}${serializeListParams({ filter: props.filter })}`,
);
</script>

<template>
  <CountSpinner v-if="isPending" :timeout="timeout" :class="props.class" />
  <span
    v-else-if="error"
    role="img"
    :aria-label="translate('chelone.notification.http_error_label', { _: 'Error' })"
    :class="cn('inline-flex text-destructive', props.class)"
  >
    <CircleXIcon />
  </span>
  <template v-else-if="data?.total != null">
    <RouterLink
      v-if="link"
      :to="to"
      :class="cn('underline-offset-4 hover:underline', props.class)"
      @click.stop
    >
      {{ data.total }}
    </RouterLink>
    <span v-else :class="props.class">{{ data.total }}</span>
  </template>
</template>
