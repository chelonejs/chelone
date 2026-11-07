/**
 * ComponentPreview — live component preview embedded in MDX docs.
 *
 * Usage in MDX:
 *   <ComponentPreview name="components/button/basic" />
 *
 * `name` format: "<component-dir>/<demo-file>" e.g. "components/button/basic"
 * Demos live at: src/docs/content/<component-dir>/demos/<demo-file>.tsx
 * Each demo file must default-export a React component. A demo may also export
 * `mode` (a `PreviewMode`) to pick the admin-context depth it renders under
 * (see PreviewProvider); the default (`"view"`) suits whole-view demos.
 */
import { type ReactNode, useEffect, useState } from "react";
import { ShikiHighlighter } from "react-shiki";
import { SHIKI_THEME } from "@/lib/shiki-theme";
import { cn } from "@/lib/utils";
import { type PreviewMode, PreviewProvider } from "./preview-provider";

// Demo modules + their raw source, globbed from content. A demo's optional
// `mode` export selects its PreviewProvider wrapper depth.
interface DemoModule {
  default: () => ReactNode;
  mode?: PreviewMode;
}

const demoModules = import.meta.glob<DemoModule>("../content/**/demos/*.tsx");

const demoSources = import.meta.glob<string>("../content/**/demos/*.tsx", {
  query: "?raw",
  import: "default",
});

/** Convert name "<component-dir>/<demo>" → glob key */
function keyFor(name: string): string | undefined {
  // name = "components/button/basic" → key = "../content/components/button/demos/basic.tsx"
  const parts = name.split("/");
  const demoFile = parts.pop();
  if (demoFile === undefined) return undefined;
  const componentDir = parts.join("/");
  const key = `../content/${componentDir}/demos/${demoFile}.tsx`;
  if (demoModules[key]) return key;
  // Fallback: try matching just the last segment as demo filename
  return Object.keys(demoModules).find((k) =>
    k.endsWith(`/demos/${demoFile}.tsx`),
  );
}

interface ComponentPreviewProps {
  /** Path: "<component-dir>/<demo-file>" e.g. "components/button/basic" */
  name: string;
  /** Optional extra className for the preview wrapper */
  className?: string;
}

type LoadedDemo =
  | { key: string; status: "loaded"; module: DemoModule; source: string }
  | { key: string; status: "error" };

export function ComponentPreview({ name, className }: ComponentPreviewProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [loaded, setLoaded] = useState<LoadedDemo>();
  const key = keyFor(name);

  // Effects run only after hydration, keeping the admin runtime out of SSG.
  useEffect(() => {
    if (!key) return;
    const loadModule = demoModules[key];
    const loadSource = demoSources[key];
    if (!loadModule || !loadSource) return;
    let cancelled = false;
    Promise.all([loadModule(), loadSource()]).then(
      ([module, source]) => {
        if (!cancelled) setLoaded({ key, status: "loaded", module, source });
      },
      () => {
        if (!cancelled) setLoaded({ key, status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) {
    return (
      <div className="my-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Demo not found: <code className="font-mono">{name}</code>
      </div>
    );
  }

  const current = loaded?.key === key ? loaded : undefined;
  const demo = current?.status === "loaded" ? current : undefined;
  const DemoComponent = demo?.module.default;
  // Unknown until the demo module loads, which is while the placeholder shows.
  const mode: PreviewMode = demo?.module.mode ?? "view";
  const inputMode = mode === "input";

  return (
    <div
      className={cn(
        "not-prose my-6 overflow-hidden rounded-xl border border-border/50",
        className,
      )}
    >
      {/* Tab bar */}
      <div className="flex border-b border-border/40 bg-muted/30">
        {(["preview", "code"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Preview panel — the demo renders inside the shared admin context
          stack (PreviewProvider) so bare @chelone/react components resolve.
          The prerendered HTML shows a placeholder until the module loads.
          An input demo lays out as a block: the centered flex row is what put
          the input in the same row as its form's title and squeezed it there. */}
      {tab === "preview" && (
        <div
          className={cn(
            "min-h-32 p-8",
            inputMode ? "block" : "flex items-center justify-center",
          )}
        >
          {DemoComponent ? (
            <PreviewProvider mode={mode}>
              <DemoComponent />
            </PreviewProvider>
          ) : (
            <span className="text-sm text-muted-foreground">
              {current?.status === "error"
                ? "Unable to load demo."
                : "Loading preview…"}
            </span>
          )}
        </div>
      )}

      {/* Code panel — react-shiki syntax highlighted source */}
      {tab === "code" && (
        <div className="overflow-x-auto text-sm">
          {demo ? (
            <ShikiHighlighter
              language="tsx"
              theme={SHIKI_THEME}
              addDefaultStyles={false}
              className="!bg-transparent p-4"
            >
              {demo.source}
            </ShikiHighlighter>
          ) : (
            <p className="p-4 text-muted-foreground">
              {current?.status === "error"
                ? "Unable to load demo."
                : "Loading source…"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ComponentPreview;
