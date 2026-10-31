<script lang="ts">
import type { OptionalSaveFormProps } from "./form-scope";

/**
 * Props for {@link TabbedForm}. With `save` the form builds its own form and
 * takes every form option; without it the form drives the one of the view above
 * it (`<Edit>`, `<Create>`), which takes the other options.
 */
export type TabbedFormProps<TFormData> = OptionalSaveFormProps<TFormData> & {
  /**
   * Sync the active tab with the URL (default `true`): each tab is a path under
   * the form's base, so a tab can be deep-linked and Back restores the previous
   * one. `false` holds the tab locally and leaves the URL alone. Read once at
   * setup.
   */
  syncWithLocation?: boolean;
};
</script>

<script setup lang="ts" generic="TFormData">
/**
 * `<TabbedForm>` — one form split into tabs, the twin of `@chelone/react`'s
 * `tabbed-form.tsx`. Tabs are the `<TabbedFormTab>` vnodes of the default slot,
 * in order. Every tab stays mounted (inactive ones are
 * `hidden`) so cross-tab validation works and one submit collects the whole
 * form. Per-tab validity reuses form groups: each tab is a group, and its
 * header reads `useFormGroup(name)` for the error dot.
 *
 * With `syncWithLocation` (the default) the edit and create routes end in a
 * catch-all, and the tabs are paths under the form's base: the current pathname
 * minus a trailing `/<params['*']>`. A tab's segment is its `path`, else its
 * `name` for every tab after the first, else `''` for the first. The active tab
 * is the first whose path matches the pathname, else the first tab.
 */
import { computed, Fragment, ref, shallowRef, useSlots, type VNode } from "vue";
import { useRouter } from "vue-router";
import {
  useRouterAdapter,
  useRouterAdapterOptional,
} from "../router/adapter";
import { useFormScope } from "./form-scope";
import { provideFormGroups } from "./form-groups";
import TabbedFormHeader from "./tabbed-form-header.vue";
import TabbedFormTab from "./tabbed-form-tab.vue";
import { provideTabbedForm } from "./tabbed-form-context";

const props = withDefaults(defineProps<TabbedFormProps<TFormData>>(), {
  resetOnSuccess: true,
  syncWithLocation: true,
});
const slots = useSlots();

const submit = useFormScope<TFormData>("TabbedForm", props);
provideFormGroups();

interface TabDescriptor {
  name: string;
  label: string;
  /** The URL segment under the form base; `''` for the form base itself. */
  path: string;
}

/**
 * Flatten fragments so a `v-for` of tabs is read like written-out ones. `tabs`
 * is shared across the recursion: a tab's default path depends on its index.
 */
function collectTabs(
  nodes: VNode[],
  tabs: TabDescriptor[] = [],
): TabDescriptor[] {
  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) {
      collectTabs(node.children as VNode[], tabs);
    } else if (node.type === TabbedFormTab) {
      const name = String(node.props?.name);
      const path = node.props?.path;
      tabs.push({
        name,
        label: String(node.props?.label ?? name),
        path: path != null ? String(path) : tabs.length > 0 ? name : "",
      });
    }
  }
  return tabs;
}

/** Read from the slot on every render: a slot call outside render warns. */
const tabs = shallowRef<TabDescriptor[]>([]);
function readTabs(): TabDescriptor[] {
  const next = collectTabs(slots.default?.() ?? []);
  const prev = tabs.value;
  const same =
    next.length === prev.length &&
    next.every(
      (tab, i) => tab.name === prev[i]?.name && tab.path === prev[i]?.path,
    );
  if (!same) tabs.value = next;
  return next;
}

// A tab's label can change without its name or path; the header reads the
// fresh label from `readTabs()` each render, so only name and path gate `tabs`.
// The mode decides which router composables run, so it is read once.
const syncWithLocation = props.syncWithLocation;
const adapter = syncWithLocation
  ? useRouterAdapter()
  : useRouterAdapterOptional();
const location = syncWithLocation ? adapter?.useLocation() : undefined;
const params = syncWithLocation ? adapter?.useParams() : undefined;
const navigate = syncWithLocation ? adapter?.useNavigate() : undefined;
const router = syncWithLocation ? useRouter() : undefined;

function decode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Where the form's own route ends, as the encoded pathname minus the trailing
 * segments of the splat. The pathname is percent-encoded and the splat is
 * decoded, so whole segments are dropped rather than a textual suffix.
 */
const base = computed(() => {
  const pathname = location?.value.pathname ?? "";
  const splat = params?.value["*"] ?? "";
  if (splat === "") return pathname.replace(/\/+$/, "");
  const count = splat.split("/").length;
  const segments = pathname.split("/");
  const tail = segments.slice(-count).join("/");
  const own =
    segments.length > count && decode(tail) === splat
      ? segments.slice(0, -count).join("/")
      : pathname;
  return own.replace(/\/+$/, "");
});

const encodeSegment = (segment: string) =>
  segment.split("/").map(encodeURIComponent).join("/");

/** The encoded path a tab lives at: what a header links to and `goToTab` pushes. */
function tabPath(tab: TabDescriptor): string {
  return tab.path === ""
    ? base.value || "/"
    : `${base.value}/${encodeSegment(tab.path)}`;
}

const selected = ref<string>();
const activeTab = computed(() => {
  const names = tabs.value.map((tab) => tab.name);
  if (syncWithLocation) {
    // Matched decoded on both sides: a tab path may hold characters that
    // the pathname carries percent-encoded.
    const pathname = decode(location?.value.pathname ?? "");
    const matched = tabs.value.find(
      (tab) => adapter?.matchPath(decode(tabPath(tab)), pathname) != null,
    );
    return matched?.name ?? names[0] ?? "";
  }
  const wanted = selected.value;
  return wanted !== undefined && names.includes(wanted)
    ? wanted
    : (names[0] ?? "");
});

/** The `href` of a tab header: the router's own, so a history base is kept. */
function tabHref(tab: TabDescriptor): string | undefined {
  return router?.resolve(tabPath(tab)).href;
}

provideTabbedForm({
  activeTab,
  syncWithLocation,
  goToTab(name) {
    const tab = tabs.value.find((candidate) => candidate.name === name);
    if (!tab) return;
    if (syncWithLocation) navigate?.(tabPath(tab));
    else selected.value = name;
  },
  submit,
});
</script>

<template>
  <div role="tablist" data-chelone-tablist>
    <TabbedFormHeader
      v-for="tab in readTabs()"
      :key="tab.name"
      :name="tab.name"
      :label="tab.label"
      :href="tabHref(tab)"
    />
  </div>
  <slot />
</template>
