<script lang="ts">
/** Props for {@link LocalesMenu}. */
export interface LocalesMenuProps {
  /** The languages listed in the menu. */
  languages: { locale: string; name: string }[];
  /** Extra CSS class appended to the trigger. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * The menu behind `<LocalesMenuButton>`. Split out so `useLocaleState`, which
 * throws without i18n, only runs once there is an i18n instance and languages
 * to switch between.
 */

import { cn } from "../../../lib/utils";
import { useTranslate } from "../../../i18n/use-translate";
import { useLocaleState } from "../../../i18n/use-locale";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { CheckIcon } from "./icons";

const props = defineProps<LocalesMenuProps>();

const [locale, setLocale] = useLocaleState();
const translate = useTranslate();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon"
        :class="cn('hidden sm:inline-flex', props.class)"
        :aria-label="translate('chelone.action.change_locale', { _: 'Change locale' })"
        data-slot="locales-menu-button"
      >
        <slot name="icon">{{ locale.toUpperCase() }}</slot>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="language in languages"
        :key="language.locale"
        :data-locale="language.locale"
        @select="setLocale(language.locale)"
      >
        {{ language.name }}
        <CheckIcon v-if="locale === language.locale" class="ml-auto" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
