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
import { type ReactNode, useEffect, useRef, useState } from "react";
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
  files: object,
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

/** Whether `name` has a demo in either framework; reads only the glob keys, so no demo loads. */
export function hasDemo(name: string): boolean {
  return (
    keyFor(demoModules, name, "tsx") !== undefined ||
    keyFor(vueSources, name, "vue") !== undefined
  );
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

/**
 * Narrower than this and the admin sidebar becomes a drawer (`useIsMobile`), so
 * a shell demo (Layout, Menu, AppBar) shows no sidebar at all. The docs column
 * is narrower than this on a normal page, so the frame is laid out at this
 * width and zoomed down to fit the panel. It sits above the breakpoint, not on
 * it: a demo that overflows its frame by a pixel gets a scrollbar, which takes
 * a pixel off the frame's viewport and puts it back under the breakpoint.
 */
const FRAME_MIN_WIDTH = 800;

export function ComponentPreview({ name, className }: ComponentPreviewProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [loaded, setLoaded] = useState<LoadedDemo>();
  const [chosen, setFramework] = useFramework();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const reactKey = keyFor(demoModules, name, "tsx");
  const vueKey = keyFor(vueSources, name, "vue");
  // The switch only offers a framework the demo exists in.
  const framework =
    reactKey && vueKey ? chosen : vueKey ? "vue" : ("react" as const);
  const key = framework === "vue" ? vueKey : reactKey;
  const frameBoxRef = useRef<HTMLDivElement>(null);
  // The panel the frame has to fit, which is narrower than the frame itself.
  const [frameBoxWidth, setFrameBoxWidth] = useState(0);

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

  // The Vue demo renders in an iframe of another app, which cannot size the
  // panel it sits in, so a fixed height cuts a list demo off. Fit the frame to
  // its content and keep it fitted while the demo changes size (its module
  // loads after the frame does, and paging a list shrinks it). jsdom has no
  // ResizeObserver, and a frame it cannot load has nothing to fit.
  useEffect(() => {
    const frame = frameRef.current;
    if (framework !== "vue" || tab !== "preview" || !frame) return;
    const fit = () => {
      // The body, not the document element: a document element is never shorter
      // than the frame it fills, so measuring it can only ever grow the frame
      // and a shrunk demo would leave an empty band under it. The body's bottom
      // edge is measured in the frame, so it carries the body's own offset.
      const body = frame.contentDocument?.body;
      if (!body) return;
      const height = Math.max(
        body.scrollHeight,
        body.getBoundingClientRect().bottom,
      );
      frame.style.height = `${Math.ceil(height)}px`;
    };
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(fit)
        : undefined;
    const onLoad = () => {
      fit();
      const body = frame.contentDocument?.body;
      if (body) observer?.observe(body);
    };
    frame.addEventListener("load", onLoad);
    if (frame.contentDocument?.readyState === "complete") onLoad();
    return () => {
      frame.removeEventListener("load", onLoad);
      observer?.disconnect();
      frame.style.height = "";
    };
  }, [framework, key, tab]);

  // The frame is laid out wider than the panel it sits in (FRAME_MIN_WIDTH), so
  // the panel is measured to get the factor the frame is zoomed down by.
  useEffect(() => {
    const box = frameBoxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setFrameBoxWidth(entry.contentRect.width);
    });
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, [framework, tab]);

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
  // A Vue frame is at least FRAME_MIN_WIDTH wide, and `zoom` scales its layout
  // box, so it fits the panel while the demo inside sees a desktop viewport.
  const frameWidth = Math.max(FRAME_MIN_WIDTH, frameBoxWidth);
  const frameZoom = frameBoxWidth === 0 ? 1 : frameBoxWidth / frameWidth;

  return (
    <div
      className={cn(
        // Not `overflow-hidden`: a field can open a list over the content below
        // it, and clipping at the card edge would cut that list off. The tab bar
        // rounds its own top so it still sits inside the card's corners.
        "not-prose my-6 rounded-xl border border-border/50",
        className,
      )}
    >
      {/* Tab bar */}
      <div className="flex items-center rounded-t-xl border-b border-border/40 bg-muted/30">
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
            // Laid out at desktop width and zoomed down to the panel, so the
            // demo sees a desktop viewport and its sidebar is a sidebar, not a
            // drawer. The frame box is the panel's width, which is what the zoom
            // factor is measured against. The frame carries no height floor of
            // its own: the panel's `min-h-32` is the floor, and a `min-h-56` on
            // the frame would hold it at 224px of a 800px-wide viewport, which
            // is a blank band under a short demo once the frame is zoomed.
            <div ref={frameBoxRef} className="w-full min-w-0">
              <iframe
                ref={frameRef}
                title={`Vue demo: ${name}`}
                src={`/vue-demo/docs-preview/${name}`}
                style={{ width: `${frameWidth}px`, zoom: frameZoom }}
                className="border-0"
              />
            </div>
          ) : DemoComponent ? (
            // `min-w-0`: the panel is a flex row, and a flex item may not shrink
            // below its min-content size by default. A table with a long-text
            // column has a min-content wider than the panel, and without this it
            // overflows the panel instead of scrolling inside the table.
            <div className="min-w-0">
              <PreviewProvider mode={mode}>
                <DemoComponent />
              </PreviewProvider>
            </div>
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
