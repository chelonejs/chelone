import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import { type RefObject, useEffect, useRef } from "react";

/**
 * How long after the last edit `settled` waits for Monaco's markers. Monaco
 * posts them about 500 ms after an edit.
 */
export const MARKERS_SETTLE_MS = 750;

export interface MonacoMarkers {
  markers: RefObject<editor.IMarker[]>;
  /**
   * Resolves with the model's markers once they reflect the last edit: at once
   * when a marker event came after it, else on the next marker event or
   * `MARKERS_SETTLE_MS` after the edit, whichever is first.
   */
  settled: () => Promise<editor.IMarker[]>;
}

/**
 * Keeps the editor model's current markers in a ref and calls `onChange` each
 * time Monaco reports a change for that model. The ref is what a validator
 * reads, so it never goes stale between renders.
 */
export function useMonacoMarkers(
  instance: editor.IStandaloneCodeEditor | null,
  monaco: typeof Monaco | null,
  onChange: (markers: editor.IMarker[]) => void,
): MonacoMarkers {
  const markers = useRef<editor.IMarker[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEditAt = useRef(0);
  const fresh = useRef(true);
  const waiting = useRef(new Set<() => void>());

  useEffect(() => {
    const model = instance?.getModel();
    if (!instance || !monaco || !model) return;
    const read = () => monaco.editor.getModelMarkers({ resource: model.uri });
    markers.current = read();
    fresh.current = true;
    const edits = model.onDidChangeContent(() => {
      lastEditAt.current = Date.now();
      fresh.current = false;
    });
    const subscription = monaco.editor.onDidChangeMarkers((uris) => {
      if (!uris.some((uri) => uri.toString() === model.uri.toString())) return;
      markers.current = read();
      fresh.current = true;
      for (const release of [...waiting.current]) release();
      onChangeRef.current(markers.current);
    });
    return () => {
      edits.dispose();
      subscription.dispose();
    };
  }, [instance, monaco]);

  const settled = () => {
    if (fresh.current) return Promise.resolve(markers.current);
    return new Promise<editor.IMarker[]>((resolve) => {
      const release = () => {
        clearTimeout(timer);
        waiting.current.delete(release);
        resolve(markers.current);
      };
      const timer = setTimeout(
        release,
        Math.max(0, lastEditAt.current + MARKERS_SETTLE_MS - Date.now()),
      );
      waiting.current.add(release);
    });
  };

  return { markers, settled };
}
