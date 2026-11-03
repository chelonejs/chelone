import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import { type Ref, shallowRef, watch } from "vue";

/**
 * How long after the last edit `settled` waits for Monaco's markers. Monaco
 * posts them about 500 ms after an edit.
 */
export const MARKERS_SETTLE_MS = 750;

// Monaco's JSON diagnostics adapter debounces validation by this long after an edit.
export const MONACO_DIAGNOSTICS_DELAY_MS = 500;

export interface MonacoMarkers {
  markers: Ref<editor.IMarker[]>;
  /**
   * Resolves with the model's markers once they reflect the last edit: at once
   * when a marker event at least `MONACO_DIAGNOSTICS_DELAY_MS` after it came,
   * else on the next such event or `MARKERS_SETTLE_MS` after the edit,
   * whichever is first.
   */
  settled: () => Promise<editor.IMarker[]>;
}

/**
 * Keeps the editor model's current markers in a ref and calls `onChange` each
 * time Monaco reports a change for that model. The ref is what a validator
 * reads, so it never goes stale between renders.
 */
export function useMonacoMarkers(
  instance: Ref<editor.IStandaloneCodeEditor | null>,
  monaco: Ref<typeof Monaco | null>,
  onChange: (markers: editor.IMarker[]) => void,
): MonacoMarkers {
  const markers = shallowRef<editor.IMarker[]>([]);
  let lastEditAt = 0;
  let fresh = true;
  const waiting = new Set<() => void>();

  watch(
    [instance, monaco],
    ([currentInstance, currentMonaco], _previous, onCleanup) => {
      const model = currentInstance?.getModel();
      if (!currentInstance || !currentMonaco || !model) return;
      const read = () =>
        currentMonaco.editor.getModelMarkers({ resource: model.uri });
      markers.value = read();
      fresh = true;
      const edits = model.onDidChangeContent(() => {
        lastEditAt = Date.now();
        fresh = false;
      });
      const subscription = currentMonaco.editor.onDidChangeMarkers((uris) => {
        if (!uris.some((uri) => uri.toString() === model.uri.toString()))
          return;
        markers.value = read();
        // Markers carry no model version: one inside the delay predates the edit.
        if (Date.now() - lastEditAt >= MONACO_DIAGNOSTICS_DELAY_MS) {
          fresh = true;
          for (const release of [...waiting]) release();
        }
        onChange(markers.value);
      });
      onCleanup(() => {
        edits.dispose();
        subscription.dispose();
      });
    },
    { immediate: true },
  );

  const settled = () => {
    if (fresh) return Promise.resolve(markers.value);
    return new Promise<editor.IMarker[]>((resolve) => {
      const release = () => {
        clearTimeout(timer);
        waiting.delete(release);
        resolve(markers.value);
      };
      const timer = setTimeout(
        release,
        Math.max(0, lastEditAt + MARKERS_SETTLE_MS - Date.now()),
      );
      waiting.add(release);
    });
  };

  return { markers, settled };
}
