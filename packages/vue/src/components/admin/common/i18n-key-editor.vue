<script lang="ts">
import type { MissingKeyStore } from "@chelone/core";

/** Props for {@link I18nKeyEditor}. */
export interface I18nKeyEditorProps {
  /** The store the app's `createI18n` writes to through `onMissingKey: store.record`. */
  store: MissingKeyStore;
  /** Start with the list showing. Default `true`. */
  defaultOpen?: boolean;
  /** Show the button that copies the typed translations as JSON. Default `true`. */
  showExport?: boolean;
  /** Extra CSS class appended to the panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<I18nKeyEditor>` — a fixed panel listing the keys the current locale missed,
 * with an input per key and an export of the typed translations as JSON. The Vue
 * twin of `@chelone/react`'s `common/i18n-key-editor.tsx`: it only reads the
 * `MissingKeyStore` the app's `createI18n` writes to through `onMissingKey`.
 *
 * Pinned at the bottom left of the viewport. Goes anywhere under `<Admin>` and
 * leaves the i18n context as `<Admin>` set it. Wire the store once with
 * `createI18n({ onMissingKey: store.record })`. The panel's own labels are never
 * listed, so it does not report itself when the catalog lacks them.
 *
 * @example
 * <script setup lang="ts">
 * import { createMissingKeyStore } from "@chelone/core";
 *
 * const store = createMissingKeyStore();
 * const i18n = createI18n({ locale: "en", messages, onMissingKey: store.record });
 * <\/script>
 *
 * <template>
 *   <I18nKeyEditor :store="store" />
 * </template>
 */

import { COPIED_MS, OWN_KEY_PREFIX } from "@chelone/core";
import type { MissingKeyEntry } from "@chelone/core";
import { computed, onScopeDispose, ref, shallowRef, watch, watchEffect } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useLocale } from "../../../i18n/use-locale";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import { Card } from "../../ui/card";
import Input from "../../ui/input.vue";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
} from "../buttons/icons";

const props = withDefaults(defineProps<I18nKeyEditorProps>(), {
  defaultOpen: true,
  showExport: true,
});

const translate = useTranslate();
const notifications = useCheloneNotifications();
const locale = useLocale();

const recorded = shallowRef<readonly MissingKeyEntry[]>([]);
watchEffect(() => {
  recorded.value = props.store.getEntries(locale.value);
});
watch(
  () => props.store,
  (store, _previous, onCleanup) => {
    onCleanup(
      store.subscribe(() => {
        recorded.value = store.getEntries(locale.value);
      }),
    );
  },
  { immediate: true },
);

const entries = computed(() =>
  recorded.value.filter((entry) => !entry.key.startsWith(OWN_KEY_PREFIX)),
);

const open = ref(props.defaultOpen);
const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
onScopeDispose(() => clearTimeout(timer));

async function copy() {
  try {
    await navigator.clipboard.writeText(props.store.toJson(locale.value));
  } catch {
    notifications?.notify(
      translate("chelone.i18n_key_editor.copy_failed", {
        _: "Could not copy the translations",
      }),
      { type: "error" },
    );
    return;
  }
  copied.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    copied.value = false;
  }, COPIED_MS);
}
</script>

<template>
  <Card
    data-slot="i18n-key-editor"
    :data-open="open"
    :class="cn('fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] gap-2 p-3', props.class)"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-medium">
        {{
          translate("chelone.i18n_key_editor.title", {
            count: entries.length,
            _: "Missing keys ({count})",
          })
        }}
      </h2>
      <div class="flex items-center gap-1">
        <Button v-if="showExport" type="button" variant="outline" size="sm" @click="copy">
          <CheckIcon v-if="copied" class="size-4" />
          <CopyIcon v-else class="size-4" />
          {{
            copied
              ? translate("chelone.i18n_key_editor.copied", { _: "Copied" })
              : translate("chelone.i18n_key_editor.export", { _: "Export" })
          }}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :aria-expanded="open"
          @click="open = !open"
        >
          <ChevronDownIcon v-if="open" class="size-4" />
          <ChevronUpIcon v-else class="size-4" />
          {{
            open
              ? translate("chelone.i18n_key_editor.hide", { _: "Hide" })
              : translate("chelone.i18n_key_editor.show", { _: "Show" })
          }}
        </Button>
      </div>
    </div>
    <div v-if="open" class="flex max-h-80 flex-col gap-3 overflow-y-auto">
      <p v-if="entries.length === 0" class="text-sm text-muted-foreground">
        {{ translate("chelone.i18n_key_editor.empty", { _: "No missing keys yet" }) }}
      </p>
      <div
        v-for="entry in entries"
        v-else
        :key="entry.key"
        data-slot="i18n-key-editor-entry"
        class="flex flex-col gap-1"
      >
        <span class="break-all font-mono text-xs text-muted-foreground">{{ entry.key }}</span>
        <Input
          :aria-label="entry.key"
          :model-value="entry.translation"
          :placeholder="entry.fallback"
          @update:model-value="props.store.setTranslation(locale, entry.key, $event)"
        />
      </div>
    </div>
  </Card>
</template>
