import { createMicroStore, type MicroStore } from "../store/micro-store";
import {
  type DataTableColumnInfo,
  getDataTableColumnId,
} from "./data-table-columns";

/**
 * What the panel edits. `editor` is generic so each adapter stores its own
 * editor type (a React node, a Vue component).
 */
export interface InspectorSelection<TEditor> {
  key: string;
  title?: string;
  editor: TEditor;
}

export interface InspectorState<TEditor> {
  enabled: boolean;
  selected: InspectorSelection<TEditor> | null;
}

export interface Inspector<TEditor> {
  store: MicroStore<InspectorState<TEditor>>;
  enable(): void;
  /** Also clears the selection. */
  disable(): void;
  toggle(): void;
  /** Replaces the selection while enabled and does nothing while disabled. */
  select(selection: InspectorSelection<TEditor>): void;
  /** Clears the selection only when its key is `key`, so a stale unmount cannot clear a newer one. */
  release(key: string): void;
}

// type-escape: context: the default editor type when the adapter does not pick one
export function createInspector<TEditor = unknown>(): Inspector<TEditor> {
  const store = createMicroStore<InspectorState<TEditor>>({
    enabled: false,
    selected: null,
  });

  const enable = (): void => store.setState({ enabled: true });
  const disable = (): void =>
    store.setState({ enabled: false, selected: null });

  return {
    store,
    enable,
    disable,
    toggle() {
      if (store.getSnapshot().enabled) disable();
      else enable();
    },
    select(selection) {
      if (!store.getSnapshot().enabled) return;
      store.setState({ selected: selection });
    },
    release(key) {
      if (store.getSnapshot().selected?.key !== key) return;
      store.setState({ selected: null });
    },
  };
}

export const inspectorPositionKey = "chelone.inspector.position";

/** The panel's width in pixels. */
export const PANEL_WIDTH = 320;

/** How far one arrow key moves the panel, in pixels. */
export const INSPECTOR_KEY_STEP = 16;

/** The message key a `<Configurable>`'s open button falls back to. */
export const INSPECTOR_OPEN_LABEL = "chelone.inspector.customize";

export interface InspectorPosition {
  x: number;
  y: number;
}

export interface InspectorViewport {
  viewportWidth: number;
  viewportHeight: number;
  panelWidth: number;
  margin?: number;
  handleHeight?: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Keeps the panel's drag handle on screen. A missing or non-finite position
 * gives the top right corner.
 */
export function clampInspectorPosition(
  position: InspectorPosition | null | undefined,
  {
    viewportWidth,
    viewportHeight,
    panelWidth,
    margin = 8,
    handleHeight = 48,
  }: InspectorViewport,
): InspectorPosition {
  const maxX = viewportWidth - panelWidth - margin;
  const maxY = viewportHeight - handleHeight;
  if (
    !position ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y)
  ) {
    return { x: clamp(maxX, margin, maxX), y: margin };
  }
  return {
    x: clamp(position.x, margin, maxX),
    y: clamp(position.y, margin, maxY),
  };
}

export function defaultConfigurableInputsStoreKey(resource: string): string {
  return `${resource}.inputs`;
}

export function configurableInputColumns(
  // type-escape: server: inputs are arbitrary element props, so source and label are checked at runtime
  inputs: readonly { source?: unknown; label?: unknown }[],
): DataTableColumnInfo[] {
  return inputs.map(({ source, label }, index) => {
    const column: DataTableColumnInfo = {
      id: getDataTableColumnId({ source, label }) ?? `input-${index}`,
    };
    if (typeof source === "string") column.source = source;
    if (typeof label === "string") column.label = label;
    return column;
  });
}
