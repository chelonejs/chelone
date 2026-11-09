/**
 * The non-component core of the dependency-free `chart` family: the config
 * type, the theme map, the `useChart` context and `componentToString`.
 *
 * Ported from shadcn-vue's `ui/chart` without its context, id and client-check
 * helper packages: the context is a typed `InjectionKey` as in
 * `dropdown-menu/context.ts`, ids come from a module counter (Vue's peer range
 * starts before Vue's own `useId`), and the client check is a `typeof window`
 * test.
 */

import * as Vue from "vue";
import {
  type Component,
  createApp,
  defineComponent,
  getCurrentInstance,
  h,
  type InjectionKey,
  inject,
  provide,
  type Ref,
  ref,
} from "vue";

/** Format: `{ THEME_NAME: CSS_SELECTOR }`. */
export const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key in string]: {
    label?: string | Component;
    icon?: string | Component;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

/** A value a tooltip can show; the datum's other fields are never read. */
export type ChartDatumValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

/** One hovered datum: field name to value. */
export type ChartDatum = Record<string, ChartDatumValue>;

/** unovis hands a tooltip either the datum or a node holding it as `data`. */
type ChartTooltipTarget = ChartDatum | { data: ChartDatum };

/** What `componentToString` adds to the props it is given. */
export interface ChartTooltipRenderProps {
  payload?: ChartDatum;
  /** The hovered x value. */
  x?: number | Date;
}

/** The props of `<ChartTooltipContent>` a caller sets. */
export interface ChartTooltipOptions {
  class?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  /** Payload key whose value names each row; defaults to the key itself. */
  nameKey?: string;
  /** Payload key shown as the heading in place of `x`. */
  labelKey?: string;
  labelFormatter?: (x: number | Date) => string | number;
  color?: string;
}

/** The contract `<ChartContainer>` provides to the chart parts. */
export interface ChartContextProps {
  id: string;
  config: Ref<ChartConfig>;
}

const ChartKey: InjectionKey<ChartContextProps> = Symbol("chelone-chart");

/** Provide the chart context (called by `<ChartContainer>` in `setup`). */
export function provideChartContext(ctx: ChartContextProps): void {
  provide(ChartKey, ctx);
}

/** Read the ambient chart context. Throws outside a `<ChartContainer>`. */
export function useChart(): ChartContextProps {
  const ctx = inject(ChartKey, null);
  if (!ctx) {
    throw new Error("useChart: used outside a <ChartContainer> component.");
  }
  return ctx;
}

let idCounter = 0;

/**
 * A page-unique id, safe to put in a selector. Inside a component it is Vue's
 * own `useId` where the installed Vue has one (3.5+), which is per app and so
 * matches between server render and hydration. Vue's peer range starts at 3.4,
 * and `componentToString` calls this outside a component; both fall back to a
 * module counter, which a server that renders several requests in one process
 * does not reset, so on Vue 3.4 pass `id` to `<ChartContainer>` for SSR.
 */
export function useId(): string {
  // Vue 3.4 has no `useId`, so the 3.5 export is probed as possibly absent.
  const vueUseId: (() => string) | undefined = Vue.useId;
  if (vueUseId && getCurrentInstance()) {
    return vueUseId().replace(/[^\w-]/g, "");
  }
  idCounter += 1;
  return `chelone-${idCounter}`;
}

function isWrapped(target: ChartTooltipTarget): target is { data: ChartDatum } {
  return (
    "data" in target &&
    typeof target.data === "object" &&
    target.data !== null &&
    !(target.data instanceof Date)
  );
}

/**
 * Turn a tooltip component into a `(data, x?) => html` function, the shape
 * unovis' tooltip `triggers` take. Returns nothing on the server, where
 * there is no DOM to render into. The HTML comes from Vue's renderer, so text
 * in the payload is escaped.
 */
export function componentToString(
  config: ChartConfig,
  component: Component,
  props?: ChartTooltipOptions,
): ((data: ChartTooltipTarget, x?: number | Date) => string) | undefined {
  if (typeof window === "undefined") return undefined;
  const id = useId();
  return (data, x) => {
    const payload = isWrapped(data) ? data.data : data;
    const host = defineComponent({
      setup() {
        provideChartContext({ id, config: ref(config) });
        return () => h(component, { ...props, payload, x });
      },
    });
    const app = createApp(host);
    const el = document.createElement("div");
    app.mount(el);
    const html = el.innerHTML;
    app.unmount();
    return html;
  };
}
