<script setup lang="ts">
/**
 * `<AuthCallback>` — a standalone page used as the redirection target for
 * external auth services (OAuth). The Vue twin of `@chelone/react`'s
 * `auth/auth-callback.tsx`.
 *
 * Displays a loading indicator while the auth response resolves; the
 * `useHandleAuthCallback` resolver OWNS the post-login redirect (via
 * `useRedirect`), so this component only branches on `error` and otherwise shows
 * the loader. On failure it renders `<AuthError>`.
 *
 * Chelone divergence (shared with the React twin): the shadmin original renders
 * a full `<Loading>` feedback component; `@chelone/vue`'s `<Loading>` is a V3-c
 * T2 (feedback) deliverable, so the loading branch is a `<Spinner>` (already
 * `role="status"`). Swap in `<Loading>` once the feedback block lands.
 *
 * @example
 * // <Admin> exposes it via a route / the auth gate:
 * <Admin :auth-provider="authProvider">…</Admin>
 */

import { computed } from "vue";
import { useHandleAuthCallback } from "../../../admin/auth-gate";
import Spinner from "../../ui/spinner.vue";
import AuthError from "./auth-error.vue";

const { error } = useHandleAuthCallback();

const errorMessage = computed(() =>
  error.value instanceof Error && error.value.message
    ? error.value.message
    : undefined,
);
</script>

<template>
  <AuthError v-if="error" :message="errorMessage" />
  <div v-else class="flex flex-col justify-center items-center h-full">
    <Spinner class="size-9" />
  </div>
</template>
