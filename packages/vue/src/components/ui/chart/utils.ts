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

import {
  type Component,
  createApp,
  defineComponent,
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

/** A page-unique id, safe to put in a selector without escaping. */
export function useId(): string {
  idCounter += 1;
  return `chelone-${idCounter}`;
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
  // biome-ignore lint/suspicious/noExplicitAny: the props of any tooltip component
  props?: Record<string, any>,
): ((data: unknown, x?: number | Date) => string) | undefined {
  if (typeof window === "undefined") return undefined;
  const id = useId();
  return (data, x) => {
    const payload =
      typeof data === "object" && data !== null && "data" in data
        ? data.data
        : data;
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
