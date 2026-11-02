<script lang="ts">
import type { CommandMenuAction } from "./command-menu-context";

/** What `<CommandMenu>` hands its body: the resolved props and the live commands. */
export interface CommandMenuContentProps {
  resources?: string[];
  searchFields: Record<string, string>;
  perResourceLimit: number;
  recentsLimit: number;
  searchDebounceMs: number;
  placeholder?: string;
  /** Registered commands plus the `actions` prop, in order. */
  commands: CommandMenuAction[];
}
</script>

<script setup lang="ts">
/**
 * The inside of the menu: the search box, the groups and the footer. It sits
 * under a `<Command>`, in the dialog or in the bottom sheet, and mirrors that
 * command's search text into the menu's `query` so `setQuery` and the record
 * search see one value.
 */

import {
  getVisibleCommands,
  groupCommands,
  type RecentEntry,
  recentsKey,
  rememberRecent,
} from "@chelone/core";
import { computed, onScopeDispose, ref, watch } from "vue";
import { useResourceRegistry } from "../../../admin/resource-registry";
import { useCheloneContext } from "../../../context";
import { useRefresh } from "../../../data/use-refresh";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useCreatePath, useNavigate } from "../../../router";
import { useStore } from "../../../store/use-store-item";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  useCommand,
} from "../../ui/command";
import CommandMenuGate from "./command-menu-gate.vue";
import CommandMenuLogout from "./command-menu-logout.vue";
import CommandMenuRecordSearch from "./command-menu-record-search.vue";
import { ListIcon } from "./icons";
import { useTheme } from "./theme-context";

const props = defineProps<CommandMenuContentProps>();
const query = defineModel<string>("query", { required: true });
const emit = defineEmits<{
  close: [];
  /** The menu runs the command: this body unmounts once the menu closes. */
  run: [action: CommandMenuAction];
}>();

const translate = useTranslate();
const getResourceLabel = useGetResourceLabel();
const registry = useResourceRegistry();
const createPath = useCreatePath();
const navigate = useNavigate();
const refresh = useRefresh();
const { setTheme } = useTheme();
const { authProvider, store } = useCheloneContext();

// The command's search text is the source while the body is open.
const command = useCommand();
watch(
  () => command.search.value,
  (text) => {
    if (text !== query.value) query.value = text;
  },
);
watch(
  query,
  (text) => {
    if (text !== command.search.value) command.setSearch(text);
  },
  { immediate: true },
);

// The record search reads the text after a pause; clearing it applies at once.
const settled = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  [query, () => props.searchDebounceMs],
  ([text, wait]) => {
    clearTimeout(timer);
    if (text.trim() === "") {
      settled.value = "";
      return;
    }
    timer = setTimeout(() => {
      settled.value = text;
    }, wait);
  },
  { immediate: true },
);
onScopeDispose(() => clearTimeout(timer));

const names = computed(() => {
  const listed = Object.keys(registry.definitions).filter(
    (name) => registry.definitions[name]?.list != null,
  );
  const only = props.resources;
  return only ? listed.filter((name) => only.includes(name)) : listed;
});

/** The record view a hit opens: show when the resource has one, else edit. */
function recordView(resource: string): "show" | "edit" | undefined {
  const definition = registry.definitions[resource];
  if (definition?.show) return "show";
  return definition?.edit ? "edit" : undefined;
}

const searched = computed(() =>
  names.value.filter((name) => recordView(name) !== undefined),
);

// An app without a store keeps no recents.
const [stored, setStored] = store
  ? useStore<RecentEntry[]>(recentsKey, [])
  : [ref<RecentEntry[]>([]), (_: RecentEntry[]) => {}];

const recents = computed(() =>
  (stored.value ?? [])
    .filter((entry) =>
      entry.type === "resource"
        ? registry.definitions[entry.resource]?.list != null
        : recordView(entry.resource) !== undefined,
    )
    .slice(0, props.recentsLimit),
);
const showRecents = computed(
  () => query.value.trim() === "" && recents.value.length > 0,
);

function remember(entry: RecentEntry): void {
  setStored(rememberRecent(stored.value ?? [], entry, props.recentsLimit));
}

function go(entry: RecentEntry): void {
  emit("close");
  remember(entry);
  if (entry.type === "resource") {
    navigate(createPath({ resource: entry.resource, type: "list" }));
    return;
  }
  const type = recordView(entry.resource);
  if (type && entry.id !== undefined)
    navigate(createPath({ resource: entry.resource, id: entry.id, type }));
}

const builtIns = computed<CommandMenuAction[]>(() => {
  const theme = translate("chelone.command_menu.theme", { _: "Theme" });
  return [
    {
      id: "refresh",
      label: translate("chelone.command_menu.refresh", { _: "Refresh" }),
      keywords: ["reload", "data"],
      onSelect: refresh,
    },
    ...(["light", "dark", "system"] as const).map((mode) => ({
      id: `theme-${mode}`,
      label: translate(`chelone.command_menu.theme_${mode}`, {
        _: `${mode[0]?.toUpperCase()}${mode.slice(1)} theme`,
      }),
      group: theme,
      keywords: ["theme", "appearance", "mode"],
      onSelect: () => setTheme(mode),
    })),
  ];
});

// Keyword arrays are built here, not in the template: a fresh array on each
// render would count as a changed prop on every item.
const groups = computed(() =>
  groupCommands(
    getVisibleCommands([...props.commands, ...builtIns.value]).map(
      (action) => ({
        ...action,
        keywords: [...(action.keywords ?? []), action.id],
      }),
    ),
  ),
);

const resourceItems = computed(() =>
  names.value.map((name) => ({
    name,
    label: getResourceLabel(name, 2),
    keywords: [name],
  })),
);

const recentItems = computed(() =>
  recents.value.map((entry) => ({
    entry,
    key: `${entry.type}/${entry.resource}/${entry.id ?? ""}`,
    keywords: [entry.label],
  })),
);

function heading(group: string): string {
  return group === "actions"
    ? translate("chelone.command_menu.actions", { _: "Actions" })
    : group;
}
</script>

<template>
  <CommandInput
    :placeholder="
      placeholder ??
      translate('chelone.command_menu.placeholder', {
        _: 'Type a command or search...',
      })
    "
  />
  <CommandList>
    <CommandEmpty>
      {{ translate("chelone.command_menu.empty", { _: "No results found." }) }}
    </CommandEmpty>

    <CommandGroup
      v-if="showRecents"
      :heading="translate('chelone.command_menu.recent', { _: 'Recent' })"
    >
      <CommandMenuGate
        v-for="{ entry, key, keywords } in recentItems"
        :key="key"
        :resource="entry.resource"
      >
        <CommandItem :value="`recent/${key}`" :keywords="keywords" @select="go(entry)">
          <component :is="registry.definitions[entry.resource]?.icon ?? ListIcon" />
          {{ entry.label }}
        </CommandItem>
      </CommandMenuGate>
    </CommandGroup>

    <CommandGroup
      :heading="translate('chelone.command_menu.resources', { _: 'Resources' })"
    >
      <CommandMenuGate v-for="item in resourceItems" :key="item.name" :resource="item.name">
        <CommandItem
          :value="item.label"
          :keywords="item.keywords"
          @select="go({ type: 'resource', resource: item.name, label: item.label })"
        >
          <component :is="registry.definitions[item.name]?.icon ?? ListIcon" />
          {{ item.label }}
        </CommandItem>
      </CommandMenuGate>
    </CommandGroup>

    <CommandMenuRecordSearch
      v-for="name in searched"
      :key="name"
      :resource="name"
      :query="settled"
      :field="searchFields[name] ?? 'q'"
      :limit="perResourceLimit"
      @select="
        (hit) => go({ type: 'record', resource: name, id: hit.id, label: hit.label })
      "
    />

    <CommandGroup v-for="[group, members] in groups" :key="group" :heading="heading(group)">
      <CommandItem
        v-for="action in members"
        :key="action.id"
        :value="action.label"
        :keywords="action.keywords"
        @select="emit('run', action)"
      >
        <component :is="action.icon" v-if="action.icon" />
        {{ action.label }}
        <CommandShortcut v-if="action.shortcut">{{ action.shortcut }}</CommandShortcut>
      </CommandItem>
    </CommandGroup>

    <CommandMenuLogout v-if="authProvider" @select="emit('close')" />
  </CommandList>
  <div
    class="flex items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground"
    data-slot="command-menu-footer"
  >
    <span class="flex items-center gap-1">
      <kbd class="rounded border px-1 font-mono">↑</kbd>
      <kbd class="rounded border px-1 font-mono">↓</kbd>
      {{ translate("chelone.command_menu.navigate", { _: "Navigate" }) }}
    </span>
    <span class="flex items-center gap-1">
      <kbd class="rounded border px-1 font-mono">↵</kbd>
      {{ translate("chelone.command_menu.select", { _: "Select" }) }}
    </span>
    <span class="flex items-center gap-1">
      <kbd class="rounded border px-1 font-mono">Esc</kbd>
      {{ translate("chelone.command_menu.close", { _: "Close" }) }}
    </span>
  </div>
</template>
