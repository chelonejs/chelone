/**
 * `<Inspector>` — a floating, draggable panel that edits whichever
 * `<Configurable>` the user picked while configure mode is on. Mount it once,
 * around `<Layout>`, as `<CommandMenu>` is; `<InspectorButton>` turns the mode
 * on. Ported from shadmin's `Inspector`.
 *
 * @example
 * <Admin>
 *   <Admin.Layout>
 *     <Inspector>
 *       <Layout />
 *     </Inspector>
 *   </Admin.Layout>
 * </Admin>
 */

import {
  clampInspectorPosition,
  createInspector,
  INSPECTOR_KEY_STEP,
  type Inspector as InspectorController,
  type InspectorPosition,
  type InspectorState,
  inspectorPositionKey,
  PANEL_WIDTH,
} from "@chelone/core";
import { X } from "lucide-react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCheloneContext } from "../../context";
import { useTranslate } from "../../i18n-hooks";

interface InspectorProps {
  children: ReactNode;
  className?: string;
}

/** The inspector's state and the calls that change it. */
interface InspectorControls
  extends InspectorState<ReactNode>,
    Omit<InspectorController<ReactNode>, "store"> {}

const InspectorContext = createContext<InspectorController<ReactNode> | null>(
  null,
);

/**
 * The panel's body element, which a `<Configurable>` portals its editor into so
 * the editor keeps the contexts (resource, list, record) around the
 * `<Configurable>` rather than the ones around the panel.
 */
const InspectorBodyContext = createContext<HTMLElement | null>(null);

function useInspectorBody(): HTMLElement | null {
  return useContext(InspectorBodyContext);
}

const subscribeNothing = () => () => {};
const noState = (): null => null;

/**
 * The nearest `<Inspector>`'s state and controls, or `null` outside one, so an
 * add-on button or wrapper can leave itself out of an app that mounts none.
 */
function useInspector(): InspectorControls | null {
  const inspector = useContext(InspectorContext);
  const state = useSyncExternalStore(
    inspector ? inspector.store.subscribe : subscribeNothing,
    inspector ? inspector.store.getSnapshot : noState,
    inspector ? inspector.store.getSnapshot : noState,
  );
  return useMemo(
    () =>
      inspector && state
        ? {
            ...state,
            enable: inspector.enable,
            disable: inspector.disable,
            toggle: inspector.toggle,
            select: inspector.select,
            release: inspector.release,
          }
        : null,
    [inspector, state],
  );
}

const subscribeToResize = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};
const windowWidth = () => window.innerWidth;
const windowHeight = () => window.innerHeight;
const serverSize = () => 0;

const ARROWS: Record<string, InspectorPosition> = {
  ArrowLeft: { x: -INSPECTOR_KEY_STEP, y: 0 },
  ArrowRight: { x: INSPECTOR_KEY_STEP, y: 0 },
  ArrowUp: { x: 0, y: -INSPECTOR_KEY_STEP },
  ArrowDown: { x: 0, y: INSPECTOR_KEY_STEP },
};

function InspectorPanel({
  inspector,
  className,
  bodyRef,
}: {
  inspector: InspectorControls;
  className?: string;
  bodyRef: (body: HTMLElement | null) => void;
}) {
  const translate = useTranslate();
  const { store } = useCheloneContext();
  // Without a store the position lives here, and is lost with the panel.
  const [local, setLocal] = useState<InspectorPosition | undefined>();
  const stored = useSyncExternalStore(
    (callback) =>
      store ? store.subscribe(inspectorPositionKey, callback) : () => {},
    () => store?.getItem<InspectorPosition>(inspectorPositionKey),
    () => undefined,
  );
  const viewportWidth = useSyncExternalStore(
    subscribeToResize,
    windowWidth,
    serverSize,
  );
  const viewportHeight = useSyncExternalStore(
    subscribeToResize,
    windowHeight,
    serverSize,
  );
  const [dragged, setDragged] = useState<InspectorPosition | null>(null);

  const clamp = (position: InspectorPosition | undefined) =>
    clampInspectorPosition(position, {
      viewportWidth,
      viewportHeight,
      panelWidth: PANEL_WIDTH,
    });
  const position = clamp(dragged ?? (store ? stored : local));

  const save = (next: InspectorPosition) => {
    if (store) store.setItem(inspectorPositionKey, next);
    else setLocal(next);
  };

  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    // The Close button is in the handle but is not a grip.
    if (event.target.closest("button")) return;
    const start = { x: event.clientX, y: event.clientY };
    const origin = position;
    let last: InspectorPosition | null = null;
    const move = (moveEvent: PointerEvent) => {
      last = clamp({
        x: origin.x + moveEvent.clientX - start.x,
        y: origin.y + moveEvent.clientY - start.y,
      });
      setDragged(last);
    };
    const end = () => {
      stopDrag.current?.();
      if (last) save(last);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    stopDrag.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
      setDragged(null);
    };
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // A key pressed on the Close button is its own.
    if (event.target !== event.currentTarget) return;
    const step = ARROWS[event.key];
    if (!step) return;
    event.preventDefault();
    save(clamp({ x: position.x + step.x, y: position.y + step.y }));
  };

  const title =
    inspector.selected?.title ??
    translate("chelone.inspector.title", { _: "Inspector" });

  return (
    <div
      role="dialog"
      aria-label={title}
      data-slot="inspector"
      style={{ left: position.x, top: position.y, width: PANEL_WIDTH }}
      className={cn(
        "fixed z-50 flex max-h-[80vh] max-w-[calc(100vw-1rem)] flex-col rounded-lg border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
    >
      <div
        data-slot="inspector-handle"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the header is the grip, and the arrow keys move the panel while it has focus
        tabIndex={0}
        role="toolbar"
        aria-label={title}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="flex cursor-grab touch-none select-none items-center gap-2 border-b px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={translate("chelone.action.close", { _: "Close" })}
          onClick={inspector.disable}
        >
          <X />
        </Button>
      </div>
      <div
        ref={bodyRef}
        data-slot="inspector-body"
        className="flex flex-col gap-3 overflow-auto p-3"
      >
        {inspector.selected ? (
          inspector.selected.editor
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate("chelone.inspector.empty", {
              _: "Pick an outlined element to configure it",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function Panel({
  className,
  bodyRef,
}: {
  className?: string;
  bodyRef: (body: HTMLElement | null) => void;
}) {
  const inspector = useInspector();
  return inspector?.enabled ? (
    <InspectorPanel
      inspector={inspector}
      className={className}
      bodyRef={bodyRef}
    />
  ) : null;
}

function Inspector({ children, className }: InspectorProps) {
  const [inspector] = useState(() => createInspector<ReactNode>());
  const [body, setBody] = useState<HTMLElement | null>(null);
  return (
    <InspectorContext.Provider value={inspector}>
      <InspectorBodyContext.Provider value={body}>
        {children}
        <Panel className={className} bodyRef={setBody} />
      </InspectorBodyContext.Provider>
    </InspectorContext.Provider>
  );
}

export {
  Inspector,
  type InspectorControls,
  type InspectorProps,
  useInspector,
  useInspectorBody,
};
