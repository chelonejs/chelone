/**
 * The dependency-free tabs family barrel — the Vue analog of shadcn's `tabs`
 * primitive (root + list + trigger + content).
 */

export {
  provideTabs,
  type TabsContext,
  TabsKey,
  type TabsOrientation,
  type TabsTriggerEntry,
  useTabs,
} from "./context";
export { default as Tabs } from "./tabs.vue";
export { default as TabsContent } from "./tabs-content.vue";
export { default as TabsList } from "./tabs-list.vue";
export { default as TabsTrigger } from "./tabs-trigger.vue";
