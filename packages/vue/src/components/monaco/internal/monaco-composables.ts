import type { editor } from "monaco-editor";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  type Ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { resolveTheme, useTheme } from "../../admin/layout/theme-context";

type CodeEditor = editor.IStandaloneCodeEditor;

/**
 * The editor's content height clamped to `[min, max]`, tracked as it changes.
 * 0 when `enabled` is false, so the caller falls back to a fixed height.
 */
export function useAutoHeight(
  instance: Ref<CodeEditor | null>,
  enabled: MaybeRefOrGetter<boolean>,
  min: number,
  max: MaybeRefOrGetter<number>,
): ComputedRef<number> {
  const contentHeight = shallowRef(0);

  watch(
    [instance, () => toValue(enabled)],
    ([current, on], _previous, onCleanup) => {
      if (!on || !current) return;
      const update = () => {
        contentHeight.value = current.getContentHeight();
      };
      update();
      const subscription = current.onDidContentSizeChange(update);
      onCleanup(() => subscription.dispose());
    },
    { immediate: true },
  );

  return computed(() =>
    toValue(enabled)
      ? Math.min(Math.max(contentHeight.value, min), toValue(max))
      : 0,
  );
}

/**
 * Re-lays the editor out when its container resizes (`automaticLayout` is off).
 * Returns the template ref to put on the container.
 */
export function useMonacoLayout(
  instance: Ref<CodeEditor | null>,
): Ref<HTMLElement | null> {
  const container = shallowRef<HTMLElement | null>(null);

  watch(
    [instance, container],
    ([current, node], _previous, onCleanup) => {
      if (!current || !node) return;
      const observer = new ResizeObserver(() => current.layout());
      observer.observe(node);
      onCleanup(() => observer.disconnect());
    },
    { immediate: true },
  );

  return container;
}

/** The Monaco theme matching the resolved Chelone theme. */
export function useMonacoTheme(): ComputedRef<"vs" | "vs-dark"> {
  const { theme } = useTheme();
  return computed(() =>
    resolveTheme(theme.value) === "dark" ? "vs-dark" : "vs",
  );
}
