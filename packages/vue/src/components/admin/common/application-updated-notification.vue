<script lang="ts">
/** Props for {@link ApplicationUpdatedNotification}. */
export interface ApplicationUpdatedNotificationProps {
  message?: string;
  buttonLabel?: string;
  /** Alias for `message`. */
  notificationText?: string;
  /** Alias for `buttonLabel`. */
  updateText?: string;
  /** Extra CSS class merged after the default positioning classes. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ApplicationUpdatedNotification>` — a card telling the user a new version of
 * the app is available, with a reload button. The Vue twin of `@chelone/react`'s
 * `common/application-updated-notification.tsx`. Pinned at the bottom centre of
 * the viewport. Not mounted by `<Layout>`: render it when the app detects a new
 * build.
 *
 * Emits `reload` when the button is clicked. With no `reload` listener attached,
 * the page reloads instead (React's `onReload` fallback).
 *
 * @example
 * <ApplicationUpdatedNotification @reload="swapServiceWorker" />
 */

import { computed, getCurrentInstance } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import { Card } from "../../ui/card";
import { SparklesIcon } from "./icons";

const props = defineProps<ApplicationUpdatedNotificationProps>();
const emit = defineEmits<{ reload: [] }>();

const translate = useTranslate();
// Declared emits are stripped from `$attrs`, so the vnode props are the only
// place to tell whether a parent attached `@reload`. `@reload.once` compiles to
// `onReloadOnce`, which `emit` also honours.
const instance = getCurrentInstance();

const messageText = computed(() => props.message ?? props.notificationText);
const buttonText = computed(() => props.buttonLabel ?? props.updateText);
const cardClass = computed(() =>
  cn(
    "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex flex-row items-center gap-3 px-4 py-3",
    props.class,
  ),
);

function onReload(): void {
  const listeners = instance?.vnode.props;
  if (listeners?.onReload || listeners?.onReloadOnce) emit("reload");
  else window.location.reload();
}
</script>

<template>
  <Card role="alert" :class="cardClass">
    <SparklesIcon class="size-4 shrink-0" />
    <span class="text-sm">
      {{
        messageText
          ? translate(messageText, { _: messageText })
          : translate("chelone.notification.application_update_available", {
              _: "A new version of the application is available",
            })
      }}
    </span>
    <Button size="sm" @click="onReload">
      {{
        buttonText
          ? translate(buttonText, { _: buttonText })
          : translate("chelone.action.reload", { _: "Reload" })
      }}
    </Button>
  </Card>
</template>
