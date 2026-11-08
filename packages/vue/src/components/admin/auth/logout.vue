<script lang="ts">
/** Props for {@link Logout}. */
export interface LogoutProps {
  /** Extra class appended to the menu item. */
  class?: string;
  /**
   * Path the user is redirected to after logout. Passed through to the
   * authProvider's `logout` params.
   */
  redirectTo?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Logout>` — a logout menu item, designed as a child of `<UserMenu>` (or any
 * `<DropdownMenuContent>`). The Vue twin of `@chelone/react`'s `auth/logout.tsx`;
 * the seams (`useAuthState` / `useLogout` + the React `<Translate>`) are rewired
 * to the Vue auth composables + `useTranslate`.
 *
 * Requires an `authProvider` (the auth composables throw without one), so mount
 * it only within an authenticated context — `<UserMenu>` already guards this.
 * Renders nothing until the auth state resolves to `authenticated: true`.
 */

import { useAuthState, useLogout } from "../../../auth/auth-hooks";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { LogOutIcon } from "../layout/icons";
import { DropdownMenuItem } from "../../ui/dropdown-menu";

const props = defineProps<LogoutProps>();

const { data } = useAuthState();
const logout = useLogout();
const translate = useTranslate();

function handleClick(): void {
  logout.mutate(
    props.redirectTo != null ? { redirectTo: props.redirectTo } : undefined,
  );
}
</script>

<template>
  <DropdownMenuItem
    v-if="data?.authenticated"
    :class="cn('cursor-pointer', props.class)"
    @select="handleClick"
  >
    <LogOutIcon />
    {{ translate("chelone.auth.logout", { _: "Log out" }) }}
  </DropdownMenuItem>
</template>
