<script setup lang="ts">
/**
 * A role that may not open the page it is on is sent to /access-denied, as the
 * viewer is from /posts/create. The menu already hides what a role may not
 * list; this covers a typed or followed URL.
 */

import { type CanAccessParams, canAccessQueryOptions } from "@chelone/core";
import { routeAccess } from "@chelone/demo-data";
import { useBasename, useCheloneContext, useRedirect } from "@chelone/vue";
import { useQuery } from "@tanstack/vue-query";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { resources } from "./resources/schema";

// What the query asks while the path is no resource's: it never runs.
const NO_CHECK: CanAccessParams = { action: "list", resource: "" };

const route = useRoute();
const basename = useBasename().replace(/\/$/, "");
const { authProvider } = useCheloneContext();
const redirect = useRedirect();

const params = computed(() =>
  routeAccess(route.path.slice(basename.length), Object.keys(resources)),
);
const { data: allowed } = useQuery(
  computed(() => ({
    ...canAccessQueryOptions(authProvider, params.value ?? NO_CHECK),
    enabled: params.value !== undefined,
  })),
);

watch(
  allowed,
  (value) => {
    if (value === false) redirect("/access-denied");
  },
  { immediate: true },
);
</script>

<template>
  <slot v-if="allowed !== false" />
</template>
