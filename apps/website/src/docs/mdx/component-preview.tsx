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
 *
 * A Vue demo sits beside it as `<demo-file>.vue`. When both exist a React/Vue
 * switch shows, and the choice (see `useFramework`) moves the whole page. The
 * website has no Vue compiler, so the Vue demo renders in an iframe of the Vue
 * demo app (`apps/vue-demo/src/DocsPreview.vue`), which compiles it.
 */
import { type ReactNode, useEffect, useState } from "react";
import { ShikiHighlighter } from "react-shiki";
import { SHIKI_THEME } from "@/lib/shiki-theme";
import { cn } from "@/lib/utils";
import { FrameworkSwitch } from "./framework-switch";
import { type PreviewMode, PreviewProvider } from "./preview-provider";
import { useFramework } from "./use-framework";

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

const vueSources = import.meta.glob<string>("../content/**/demos/*.vue", {
  query: "?raw",
  import: "default",
});

/** name "<component-dir>/<demo>" → the glob key of that demo in `files`, if there is one. */
function keyFor(
  files: Record<string, unknown>,
  name: string,
  extension: "tsx" | "vue",
): string | undefined {
  // name = "components/button/basic" → key = "../content/components/button/demos/basic.tsx"
  const parts = name.split("/");
  const demoFile = parts.pop();
  if (demoFile === undefined) return undefined;
  const key = `../content/${parts.join("/")}/demos/${demoFile}.${extension}`;
  return key in files ? key : undefined;
}

interface ComponentPreviewProps {
  /** Path: "<component-dir>/<demo-file>" e.g. "components/button/basic" */
  name: string;
  /** Optional extra className for the preview wrapper */
  className?: string;
}

type LoadedDemo =
  | {
      key: string;
      status: "loaded";
      /** Absent for a Vue demo: the Vue demo app compiles and mounts it. */
      module?: DemoModule;
      source: string;
    }
  | { key: string; status: "error" };

export function ComponentPreview({ name, className }: ComponentPreviewProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [loaded, setLoaded] = useState<LoadedDemo>();
  const [chosen, setFramework] = useFramework();
  const reactKey = keyFor(demoModules, name, "tsx");
  const vueKey = keyFor(vueSources, name, "vue");
  // The switch only offers a framework the demo exists in.
  const framework =
    reactKey && vueKey ? chosen : vueKey ? "vue" : ("react" as const);
  const key = framework === "vue" ? vueKey : reactKey;

  // Effects run only after hydration, keeping the admin runtime out of SSG.
  useEffect(() => {
    if (!key) return;
    const loadModule = framework === "react" ? demoModules[key] : undefined;
    const loadSource = (framework === "vue" ? vueSources : demoSources)[key];
    if (!loadSource || (framework === "react" && !loadModule)) return;
    let cancelled = false;
    Promise.all([loadModule?.(), loadSource()]).then(
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
  }, [key, framework]);

  if (!key) {
    return (
      <div className="my-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Demo not found: <code className="font-mono">{name}</code>
      </div>
    );
  }

  const current = loaded?.key === key ? loaded : undefined;
  const demo = current?.status === "loaded" ? current : undefined;
  const DemoComponent = demo?.module?.default;
  // Unknown until the demo module loads, which is while the placeholder shows.
  const mode: PreviewMode = demo?.module?.mode ?? "view";
  const inputMode = mode === "input";

  return (
    <div
      className={cn(
        "not-prose my-6 overflow-hidden rounded-xl border border-border/50",
        className,
      )}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-border/40 bg-muted/30">
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
        {reactKey && vueKey && (
          <div className="ml-auto px-2">
            <FrameworkSwitch framework={framework} onChange={setFramework} />
          </div>
        )}
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
          {framework === "vue" ? (
            <iframe
              title={`Vue demo: ${name}`}
              src={`/vue-demo/docs-preview/${name}`}
              className="h-56 w-full border-0"
            />
          ) : DemoComponent ? (
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
              language={framework === "vue" ? "vue" : "tsx"}
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
