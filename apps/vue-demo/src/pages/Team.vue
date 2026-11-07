<script lang="ts">
export const title = "Team";
export const group = "Team";
</script>

<script setup lang="ts">
/**
 * The Team page, the Vue twin of `apps/demo`'s: who may do what, and the words
 * the admin speaks.
 *
 * "Browsing as" picks a role, and `makeDemoAuthProvider` answers every access
 * check from that role's row of the role matrix, so the menu and the resource
 * pages follow it. The matrix sits behind `<CanAccess>` on a `roles` resource
 * only admins hold, so choosing another role hides it. Below it,
 * `<I18nKeyEditor>` lists the keys the current locale lacks: pick a language
 * in the app bar and type, and the strings on the page change as you type.
 */

import type { PermissionMatrixValue } from "@chelone/core";
import {
  DEFAULT_ROLE,
  defaultPermissions,
  PERMISSIONS_KEY,
  ROLE_KEY,
  TEAM_RESOURCES,
  TEAM_ROLES,
} from "@chelone/demo-data";
import {
  Button,
  CanAccess,
  I18nKeyEditor,
  PermissionMatrix,
  useLocale,
  useStore,
  useTranslate,
} from "@chelone/vue";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, onScopeDispose, ref } from "vue";
import { demoI18n, missingKeys } from "../i18n";

const translate = useTranslate();
const locale = useLocale();
const queryClient = useQueryClient();

// `translate` re-reads on a locale change only, so a translation typed into
// the panel re-renders this page through the bridge's own subscription.
const version = ref(demoI18n.version());
onScopeDispose(
  demoI18n.subscribe(() => {
    version.value = demoI18n.version();
  }),
);
const t = (key: string, params: Parameters<typeof translate>[1]) => {
  void version.value;
  return translate(key, params);
};

const [storedRole, setRole] = useStore<string>(ROLE_KEY, DEFAULT_ROLE);
const [storedPermissions, setPermissions] = useStore<PermissionMatrixValue>(
  PERMISSIONS_KEY,
  defaultPermissions,
);
const role = computed(() => storedRole.value ?? DEFAULT_ROLE);
const permissions = computed(() => storedPermissions.value ?? defaultPermissions);

// Access answers are cached, so a change to either key drops them.
function refreshAccess() {
  void queryClient.invalidateQueries({ queryKey: ["auth", "canAccess"] });
}

function browseAs(name: string) {
  setRole(name);
  refreshAccess();
}

function editPermissions(next: PermissionMatrixValue) {
  setPermissions(next);
  refreshAccess();
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-8">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">
        {{ t("demo.team.title", { _: "Team" }) }}
      </h1>
      <p class="text-muted-foreground">
        {{
          t("demo.team.intro", {
            _: "Pick a role to browse the admin as it, and edit what each role may do.",
          })
        }}
      </p>
    </header>

    <section aria-label="Browsing as" class="flex flex-col gap-2">
      <h2 class="text-sm font-medium">
        {{ t("demo.team.browsing_as", { _: "Browsing as" }) }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="name in TEAM_ROLES"
          :key="name"
          type="button"
          size="sm"
          :variant="name === role ? 'default' : 'outline'"
          :aria-pressed="name === role"
          @click="browseAs(name)"
        >
          {{ name }}
        </Button>
      </div>
    </section>

    <CanAccess action="edit" resource="roles">
      <section aria-label="Role matrix" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium">
          {{ t("demo.team.matrix", { _: "Role matrix" }) }}
        </h2>
        <PermissionMatrix
          :model-value="permissions"
          :roles="TEAM_ROLES"
          :resources="TEAM_RESOURCES"
          @update:model-value="editPermissions"
        />
      </section>
      <template #accessDenied>
        <p
          role="status"
          class="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
        >
          {{
            t("demo.team.admins_only", {
              _: "Only admins edit what each role may do. Browse as admin to see the role matrix.",
            })
          }}
        </p>
      </template>
    </CanAccess>

    <section aria-label="Translations" class="flex flex-col gap-2">
      <h2 class="text-sm font-medium">
        {{ t("demo.team.translations", { _: "Translations" }) }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{
          t("demo.team.translations_help", {
            _: "This panel lists the keys the {locale} catalog lacks. Pick Français in the app bar, type a translation and the text on this page changes.",
            locale,
          })
        }}
      </p>
      <!-- The panel is fixed to the viewport by default; static keeps it here. -->
      <I18nKeyEditor :store="missingKeys" class="static w-full max-w-md" />
    </section>
  </div>
</template>
