/**
 * Pure rules for an in-place editor. No react, no vue: both InPlaceEditor
 * adapters step through the same states and send the same fields on a save.
 */

import type { LooseRecord, ResourceRecord } from "../resource/record";
import { isLooseRecord } from "../resource/record";
import { deepEqual } from "./deep-equal";

export type InPlaceEditorState<R extends ResourceRecord = LooseRecord> =
  | { status: "reading" }
  | { status: "editing" }
  | { status: "saving"; preview: R };

export type InPlaceEditorEvent<R extends ResourceRecord = LooseRecord> =
  | { type: "edit" }
  | { type: "cancel" }
  | { type: "save"; preview: R }
  | { type: "settled" };

/**
 * Steps the editor: reading to editing on `edit`, editing to reading on
 * `cancel`, editing to saving on `save`, saving to reading on `settled`. Any
 * other pair returns the same state object, so a click while saving does nothing.
 */
export function nextInPlaceEditorState<R extends ResourceRecord = LooseRecord>(
  state: InPlaceEditorState<R>,
  event: InPlaceEditorEvent<R>,
): InPlaceEditorState<R> {
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
  data: Partial<R>;
  previousData: R;
  /** The record with the changed fields over it. */
  preview: R;
}

/**
 * Plans a save from the record and the dirty form values. `data` keeps the
 * fields whose value is not deeply equal to the record's, so a value typed and
 * then typed back is dropped. Returns `null` when nothing changed, so a save
 * with no change makes no call.
 */
export function planInPlaceSave<R extends ResourceRecord>(
  record: R,
  dirty: Partial<NoInfer<R>>,
): InPlaceSave<R> | null {
  if (!isLooseRecord(record)) return null;
  const changed = Object.entries(dirty).filter(
    ([key, value]) => !deepEqual(record[key], value),
  );
  if (changed.length === 0) return null;
  // type-escape: the form holds the record's own fields, so the changed ones are a patch of it
  const data = Object.fromEntries(changed) as Partial<R>;
  return {
    id: record.id,
    data,
    previousData: record,
    preview: { ...record, ...data },
  };
}
