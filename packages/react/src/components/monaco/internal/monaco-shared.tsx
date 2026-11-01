import type { editor } from "monaco-editor";
import { type RefObject, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "../../admin/layout/use-theme";

type CodeEditor = editor.IStandaloneCodeEditor;

/** The pulsing placeholder shown while the editor chunk loads. */
export function MonacoSkeleton({
  height,
  className,
}: {
  height: number;
  className?: string;
}) {
  return (
    <Skeleton
      role="status"
      aria-label="Loading editor"
      className={cn("w-full border", className)}
      style={{ height }}
    />
  );
}

/**
 * The editor's content height clamped to `[min, max]`, tracked as it changes.
 * 0 when `enabled` is false, so the caller falls back to a fixed height.
 */
export function useAutoHeight(
  instance: CodeEditor | null,
  enabled: boolean,
  min: number,
  max: number,
): number {
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (!enabled || !instance) return;
    const update = () => setContentHeight(instance.getContentHeight());
    update();
    const subscription = instance.onDidContentSizeChange(update);
    return () => subscription.dispose();
  }, [instance, enabled]);

  if (!enabled) return 0;
  return Math.min(Math.max(contentHeight, min), max);
}

/** Re-lays the editor out when its container resizes (`automaticLayout` is off). */
export function useMonacoLayout(
  instance: CodeEditor | null,
  container: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const node = container.current;
    if (!instance || !node) return;
    const observer = new ResizeObserver(() => instance.layout());
    observer.observe(node);
    return () => observer.disconnect();
  }, [instance, container]);
}

/** The Monaco theme matching the resolved Chelone theme. */
export function useMonacoTheme(): "vs" | "vs-dark" {
  return useResolvedTheme() === "dark" ? "vs-dark" : "vs";
}
