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

/** What a Vue demo frame reports about the height its own content needs. */
interface DemoHeightMessage {
  type: "chelone-docs-demo-height";
  height: number;
}

function isDemoHeightMessage(value: unknown): value is DemoHeightMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "chelone-docs-demo-height" &&
    "height" in value &&
    typeof value.height === "number"
  );
}

// The frame starts at this height and grows to what the demo reports, capped so
// a runaway demo cannot push the docs page into a huge blank panel.
const FRAME_MIN_HEIGHT = 128;
const FRAME_DEFAULT_HEIGHT = 224;
const FRAME_MAX_HEIGHT = 1000;
/**
 * Narrower than this and the admin sidebar becomes a drawer (`useIsMobile`), so
 * a shell demo (Layout, Menu) would show no sidebar at all. The docs column is
 * narrower than this on a normal page, so the frame is laid out at this width
 * and zoomed down to fit the panel. It sits above the breakpoint, not on it: a
 * demo that overflows its frame by a pixel gets a scrollbar, which takes a
 * pixel off the frame's viewport and puts it back under the breakpoint.
 */
const FRAME_MIN_WIDTH = 800;

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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  // A Vue demo sizes its own frame, so the panel never clips it (see DocsPreview).
  const [frameHeight, setFrameHeight] = useState<number>();
  const [frameBoxWidth, setFrameBoxWidth] = useState(0);

  // Effects run only after hydration, keeping the admin runtime out of SSG.
  useEffect(() => {
    setFrameHeight(undefined);
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

  // The Vue demo lives in the Vue demo app, which knows what it rendered and
  // posts that height here. Only its own frame counts, not any other frame.
  useEffect(() => {
    if (framework !== "vue") return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!isDemoHeightMessage(event.data)) return;
      setFrameHeight(
        Math.min(
          Math.max(event.data.height, FRAME_MIN_HEIGHT),
          FRAME_MAX_HEIGHT,
        ),
      );
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [framework]);

  // The panel the frame sits in, so the frame can be zoomed to fit it.
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
  // A Vue frame is at least FRAME_MIN_WIDTH wide and zoomed down to the panel.
  const frameWidth = Math.max(FRAME_MIN_WIDTH, frameBoxWidth);
  const frameZoom = frameBoxWidth === 0 ? 1 : frameBoxWidth / frameWidth;

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
            // The frame is laid out at desktop width and zoomed to the panel, so
            // the demo sees a desktop viewport and its sidebar is a sidebar, not
            // a drawer. `zoom` scales the layout box, so the panel sizes to it.
            <div ref={frameBoxRef} className="w-full min-w-0">
              <iframe
                ref={frameRef}
                title={`Vue demo: ${name}`}
                src={`/vue-demo/docs-preview/${name}`}
                style={{
                  width: frameWidth,
                  height: frameHeight ?? FRAME_DEFAULT_HEIGHT,
                  zoom: frameZoom,
                }}
                className="border-0"
              />
            </div>
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
