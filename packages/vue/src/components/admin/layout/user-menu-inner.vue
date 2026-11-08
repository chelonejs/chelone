<script setup lang="ts">
/**
 * `<UserMenuInner>` — the identity-reading body of `<UserMenu>`, mounted only
 * when an `authProvider` is present (the guard lives in `user-menu.vue`). Split
 * out because `useGetIdentity` calls `useCheloneAuthProvider`, which throws
 * without a provider — a composable cannot be called conditionally, so the read
 * is isolated behind the parent's `v-if` (parity with the React twin's
 * `<UserMenuInner>` mounted past the provider guard).
 *
 * Renders the avatar trigger + a dropdown with the user's name, any custom
 * children (the default slot), and the `<Logout>` item.
 */

import { computed } from "vue";
import { useGetIdentity } from "../../../auth/auth-hooks";
import { useTranslate } from "../../../i18n/use-translate";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import Skeleton from "../../ui/skeleton.vue";
import Logout from "../auth/logout.vue";

const props = defineProps<{
  /** aria-label override for the trigger (translated). */
  label?: string;
  /**
   * Whether `<UserMenu>` received custom children (forwarded through the default
   * slot). Threaded as a prop — not read off this component's own slots — so the
   * extra separator shows only for real children, since the forwarded `<slot />`
   * is always defined even when empty.
   */
  hasChildren?: boolean;
}>();

const { isPending, data: identity } = useGetIdentity();
const translate = useTranslate();

const ariaLabel = computed(() =>
  props.label != null
    ? translate(props.label, { _: props.label })
    : identity.value?.fullName ||
      translate("chelone.auth.user_menu", { _: "User menu" }),
);
const initial = computed(() => identity.value?.fullName?.charAt(0) ?? "");
</script>

<template>
  <Skeleton v-if="isPending" class="ml-2 size-8 rounded-full" />
  <DropdownMenu v-else>
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        class="relative ml-2 size-8 rounded-full"
        :aria-label="ariaLabel"
      >
        <Avatar class="size-8">
          <AvatarImage :src="identity?.avatar" :alt="identity?.fullName" />
          <AvatarFallback>{{ initial }}</AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-56" align="end">
      <DropdownMenuLabel class="font-normal">
        <div class="flex flex-col gap-y-1">
          <p class="text-sm font-medium leading-none">
            {{ identity?.fullName }}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <slot />
      <DropdownMenuSeparator v-if="hasChildren" />
      <Logout />
    </DropdownMenuContent>
  </DropdownMenu>
</template>
