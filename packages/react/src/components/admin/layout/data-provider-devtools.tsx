/**
 * `<DataProviderDevtools>` — a round button at the bottom right carrying a
 * badge with the number of calls a `createDataProviderLog` log has recorded.
 * Activating it opens a panel listing those calls: method, resource, duration
 * and, for a failed call, the error. The panel's Hide button, or the
 * `shortcut`, closes it back to the button. Wrap the data provider with
 * `log.wrap`, then mount the component once, in the layout.
 *
 * @example
 * const log = createDataProviderLog();
 * const dataProvider = log.wrap(baseProvider);
 *
 * <Admin dataProvider={dataProvider}>
 *   <Admin.Layout>
 *     <DataProviderDevtools log={log} />
 *   </Admin.Layout>
 * </Admin>
 */

import {
  type DataProviderLog,
  type DataProviderLogEntry,
  DEVTOOLS_MAX_VALUE_LENGTH,
  shouldHandleHotkey,
} from "@chelone/core";
import { ActivityIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useEvent } from "../../../util/use-event";

export interface DataProviderDevtoolsProps {
  /** The log whose entries the panel shows. */
  log: DataProviderLog;
  /** Whether the panel starts expanded. @default true */
  defaultOpen?: boolean;
  /** Binding that shows or hides the panel, in the command menu's syntax. @default "mod+shift+d" */
  shortcut?: string;
  className?: string;
}

/** Where the component sits, closed and open. An app moves it with `className`. */
const TRIGGER_CLASSES = "fixed right-4 bottom-4 z-50 rounded-full shadow-lg";
const PANEL_CLASSES =
  "fixed right-4 bottom-4 z-50 flex max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] flex-col rounded-lg border bg-popover text-xs text-popover-foreground shadow-lg";

/** The value as indented JSON cut to `DEVTOOLS_MAX_VALUE_LENGTH`, or `undefined` when there is none to show. */
// type-escape: params and results are whatever the provider's methods take and give
function show(value: unknown): string | undefined {
  try {
    return JSON.stringify(value, null, 2)?.slice(0, DEVTOOLS_MAX_VALUE_LENGTH);
  } catch {
    return "[unserializable]";
  }
}

// type-escape: see show
function Detail({ label, value }: { label: string; value: unknown }) {
  const text = show(value);
  if (text === undefined) return null;
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <pre className="max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}

function Entry({ entry }: { entry: DataProviderLogEntry }) {
  const translate = useTranslate();
  return (
    <li
      data-slot="data-provider-devtools-entry"
      data-status={entry.status}
      className="border-b px-3 py-1.5 last:border-b-0 data-[status=error]:text-destructive"
    >
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">{entry.method}</span>
        <span className="truncate">{entry.resource}</span>
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
          {entry.durationMs.toFixed(1)}ms
        </span>
      </div>
      {entry.error !== undefined && <p className="break-all">{entry.error}</p>}
      <details>
        <summary className="cursor-pointer text-muted-foreground">
          {translate("chelone.devtools.details", { _: "Details" })}
        </summary>
        <Detail
          label={translate("chelone.devtools.params", { _: "Params" })}
          value={entry.params}
        />
        <Detail
          label={translate("chelone.devtools.result", { _: "Result" })}
          value={entry.result}
        />
      </details>
    </li>
  );
}

export function DataProviderDevtools({
  log,
  defaultOpen = true,
  shortcut = "mod+shift+d",
  className,
}: DataProviderDevtoolsProps) {
  const translate = useTranslate();
  const [open, setOpen] = useState(defaultOpen);
  const { entries } = useSyncExternalStore(
    log.store.subscribe,
    log.store.getSnapshot,
    log.store.getSnapshot,
  );

  // The listener reads the newest `shortcut` without rebinding on each render.
  const onKeyDown = useEvent((event: KeyboardEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (shouldHandleHotkey(event, shortcut, target)) {
      event.preventDefault();
      setOpen((current) => !current);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lastOpen = useRef(open);
  // The trigger and the panel replace each other, so a swap unmounts whatever
  // held focus. Hand focus to the element that takes its place, and leave focus
  // alone when the swap removed nothing the user was in (a shortcut press).
  useEffect(() => {
    if (lastOpen.current === open) return;
    lastOpen.current = open;
    const focused = document.activeElement;
    if (focused !== null && focused !== document.body && focused.isConnected) {
      return;
    }
    (open ? panelRef : triggerRef).current?.focus();
  }, [open]);

  const title = translate("chelone.devtools.title", { _: "Data provider" });

  // Closed: the trigger replaces the panel entirely, so nothing covers the UI.
  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={false}
        aria-label={`${title} (${entries.length})`}
        data-slot="data-provider-devtools"
        data-open={false}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          TRIGGER_CLASSES,
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <ActivityIcon />
        <span
          data-slot="data-provider-devtools-badge"
          className="absolute top-0 right-0 min-w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground tabular-nums"
        >
          {entries.length}
        </span>
      </button>
    );
  }

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label={title}
      data-slot="data-provider-devtools"
      data-open={true}
      className={cn(PANEL_CLASSES, className)}
    >
      <header className="flex items-center gap-2 border-b px-3 py-1.5">
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground tabular-nums">
          {entries.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto"
          onClick={() => log.clear()}
        >
          {translate("chelone.devtools.clear", { _: "Clear" })}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-expanded={true}
          onClick={() => setOpen(false)}
        >
          {translate("chelone.devtools.hide", { _: "Hide" })}
        </Button>
      </header>
      {entries.length === 0 ? (
        <p className="px-3 py-2 text-muted-foreground">
          {translate("chelone.devtools.empty", { _: "No calls yet" })}
        </p>
      ) : (
        // `min-h-0`: a flex child keeps its content height otherwise, and the
        // list would spill past the panel's `max-h` instead of scrolling.
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {[...entries].reverse().map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}
