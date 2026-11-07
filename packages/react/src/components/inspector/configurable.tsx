/**
 * `<Configurable>` — marks a piece of the page as configurable. While the
 * inspector's configure mode is on it is outlined and shows a Customize button
 * that opens its `editor` in the panel. Ported from shadmin's `Configurable`.
 * Without an `<Inspector>` it renders its children and nothing else.
 */

import { INSPECTOR_OPEN_LABEL } from "@chelone/core";
import { SlidersHorizontal } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import {
  type InspectorControls,
  useInspector,
  useInspectorBody,
} from "./inspector";

interface ConfigurableProps {
  children: ReactNode;
  /** What the panel shows while this is selected. */
  editor: ReactNode;
  /** Names this piece, so a stale unmount cannot clear another's selection. */
  preferenceKey: string;
  /** The panel's title while this is selected. */
  title?: string;
  /** A message key for the Customize button, translated with itself as the fallback. */
  openButtonLabel?: string;
  className?: string;
}

function Selectable({
  inspector,
  children,
  editor,
  preferenceKey,
  title,
  openButtonLabel,
  className,
}: ConfigurableProps & { inspector: InspectorControls }) {
  const translate = useTranslate();
  const body = useInspectorBody();
  const { enabled, selected, select, release } = inspector;
  const isSelected = selected?.key === preferenceKey;

  useEffect(() => () => release(preferenceKey), [release, preferenceKey]);

  // The panel keeps the title it was given, so a new one has to be handed over.
  useEffect(() => {
    if (selected?.key === preferenceKey && selected.title !== title) {
      select({ key: preferenceKey, title, editor: null });
    }
  }, [selected, preferenceKey, title, select]);

  return (
    <div
      data-slot="configurable"
      data-inspector-enabled={enabled ? "" : undefined}
      data-selected={isSelected ? "" : undefined}
      className={cn(
        "group/configurable relative data-[inspector-enabled]:rounded-md data-[inspector-enabled]:outline-2 data-[inspector-enabled]:outline-dashed data-[inspector-enabled]:outline-primary/40 data-[selected]:outline-solid data-[selected]:outline-primary",
        className,
      )}
    >
      {children}
      {enabled ? (
        <Button
          type="button"
          size="xs"
          className="absolute top-1 right-1 z-10 opacity-0 focus-visible:opacity-100 group-focus-within/configurable:opacity-100 group-hover/configurable:opacity-100 group-data-[selected]/configurable:opacity-100"
          onClick={() => select({ key: preferenceKey, title, editor: null })}
        >
          <SlidersHorizontal />
          {translate(openButtonLabel ?? INSPECTOR_OPEN_LABEL, {
            _: openButtonLabel ?? "Customize",
          })}
        </Button>
      ) : null}
      {/* Portalled, so the editor reads the contexts around this, not the panel's. */}
      {isSelected && body ? createPortal(editor, body) : null}
    </div>
  );
}

/**
 * Wraps `children` in an outlined, selectable region while configure mode is
 * on. The wrapper is there whether or not the mode is on, so turning it on
 * never remounts `children`.
 *
 * @example
 * import { Configurable } from "@chelone/react/inspector";
 *
 * <Configurable preferenceKey="posts.columns" title="Columns" editor={<SortableFieldsSelector storeKey="posts.datatable" />}>
 *   <PostTable />
 * </Configurable>
 */
function Configurable(props: ConfigurableProps) {
  const inspector = useInspector();
  if (!inspector) return props.children;
  return <Selectable inspector={inspector} {...props} />;
}

export { Configurable, type ConfigurableProps };
