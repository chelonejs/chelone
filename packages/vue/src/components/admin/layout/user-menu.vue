<script lang="ts">
/** Props for {@link UserMenu}. */
export interface UserMenuProps {
  /**
   * aria-label override for the avatar trigger (translated). Defaults to the
   * identity's `fullName`, falling back to the translated "User menu".
   */
  label?: string;
}
</script>

<script setup lang="ts">
/**
 * `<UserMenu>` — the avatar dropdown in the app bar. The Vue twin of
 * `@chelone/react`'s `layout/user-menu.tsx`.
 *
 * Chelone divergence (mirrored from the React twin): with NO `authProvider` the
 * menu renders nothing (the presence check reads `useCheloneContext`). Because
 * `useGetIdentity` calls `useChelonAuthProvider` (which throws without a
 * provider), the identity read is isolated in `<UserMenuInner>`, mounted only
 * past the provider guard via `v-if` — a composable cannot be called
 * conditionally, so the guard lives in the parent's template.
 *
 * Custom children (the default slot) render between the name and the logout
 * item; `hasChildren` is threaded to the inner component so the extra separator
 * shows only for real children.
 */

import { useSlots } from "vue";
import { useCheloneContext } from "../../../context";
import UserMenuInner from "./user-menu-inner.vue";

defineProps<UserMenuProps>();

const { authProvider } = useCheloneContext();
const slots = useSlots();
</script>

<template>
  <UserMenuInner
    v-if="authProvider"
    :label="label"
    :has-children="slots.default != null"
  >
    <slot />
  </UserMenuInner>
</template>
