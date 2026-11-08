<script setup lang="ts">
/**
 * The `Log out` item. `useLogout` throws without an `authProvider`, so the
 * menu mounts this child only when there is one.
 */

import { useLogout } from "../../../auth/auth-hooks";
import { useTranslate } from "../../../i18n/use-translate";
import { CommandGroup, CommandItem } from "../../ui/command";
import { LogOutIcon } from "./icons";

const emit = defineEmits<{ select: [] }>();

const logout = useLogout();
const translate = useTranslate();

function onSelect(): void {
  logout.mutate(undefined);
  emit("select");
}
</script>

<template>
  <CommandGroup :heading="translate('chelone.command_menu.account', { _: 'Account' })">
    <CommandItem
      :value="translate('chelone.auth.logout', { _: 'Log out' })"
      :keywords="['sign out']"
      @select="onSelect"
    >
      <LogOutIcon />
      {{ translate("chelone.auth.logout", { _: "Log out" }) }}
    </CommandItem>
  </CommandGroup>
</template>
