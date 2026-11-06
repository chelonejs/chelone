/**
 * Pure rules for an in-place editor. No react, no vue: both InPlaceEditor
 * adapters step through the same states and send the same fields on a save.
 */

import type { ResourceRecord } from "../resource/record";
import { isLooseRecord } from "../resource/record";
import { deepEqual } from "./deep-equal";

export type InPlaceEditorState =
  | { status: "reading" }
  | { status: "editing" }
  // type-escape: a preview is the record with its edits over it, whose type the editor has erased
  | { status: "saving"; preview: Record<string, unknown> };

export type InPlaceEditorEvent =
  | { type: "edit" }
  | { type: "cancel" }
  // type-escape: a preview is the record with its edits over it, whose type the editor has erased
  | { type: "save"; preview: Record<string, unknown> }
  | { type: "settled" };

/**
 * Steps the editor: reading to editing on `edit`, editing to reading on
 * `cancel`, editing to saving on `save`, saving to reading on `settled`. Any
 * other pair returns the same state object, so a click while saving does nothing.
 */
export function nextInPlaceEditorState(
  state: InPlaceEditorState,
  event: InPlaceEditorEvent,
): InPlaceEditorState {
  switch (state.status) {
    case "reading":
      return event.type === "edit" ? { status: "editing" } : state;
    case "editing":
      if (event.type === "cancel") return { status: "reading" };
      if (event.type === "save") {
        return { status: "saving", preview: event.preview };
      }
      return state;
    case "saving":
      return event.type === "settled" ? { status: "reading" } : state;
  }
}

export interface InPlaceSave<R extends ResourceRecord> {
  id: R["id"];
  // type-escape: the changed fields are whatever the form held, keyed by name
  data: Record<string, unknown>;
  previousData: R;
  // type-escape: the preview is the record with the changed fields over it
  preview: Record<string, unknown>;
}

/**
 * Plans a save from the record and the dirty form values. `data` keeps the
 * fields whose value is not deeply equal to the record's, so a value typed and
 * then typed back is dropped. Returns `null` when nothing changed, so a save
 * with no change makes no call.
 */
export function planInPlaceSave<R extends ResourceRecord>(
  record: R,
  // type-escape: dirty values come from a form read by name
  dirty: Record<string, unknown>,
): InPlaceSave<R> | null {
  if (!isLooseRecord(record)) return null;
  const data = Object.fromEntries(
    Object.entries(dirty).filter(
      ([key, value]) => !deepEqual(record[key], value),
    ),
  );
  if (Object.keys(data).length === 0) return null;
  return {
    id: record.id,
    data,
    previousData: record,
    preview: { ...record, ...data },
  };
}
