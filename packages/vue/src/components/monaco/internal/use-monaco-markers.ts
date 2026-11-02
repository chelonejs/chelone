import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import { type Ref, shallowRef, watch } from "vue";

/**
 * Keeps the editor model's current markers in a ref and calls `onChange` each
 * time Monaco reports a change for that model. The ref is what a validator
 * reads, so it never goes stale between renders.
 */
export function useMonacoMarkers(
  instance: Ref<editor.IStandaloneCodeEditor | null>,
  monaco: Ref<typeof Monaco | null>,
  onChange: (markers: editor.IMarker[]) => void,
): Ref<editor.IMarker[]> {
  const markers = shallowRef<editor.IMarker[]>([]);

  watch(
    [instance, monaco],
    ([currentInstance, currentMonaco], _previous, onCleanup) => {
      const model = currentInstance?.getModel();
      if (!currentInstance || !currentMonaco || !model) return;
      const read = () =>
        currentMonaco.editor.getModelMarkers({ resource: model.uri });
      markers.value = read();
      const subscription = currentMonaco.editor.onDidChangeMarkers((uris) => {
        if (!uris.some((uri) => uri.toString() === model.uri.toString()))
          return;
        markers.value = read();
        onChange(markers.value);
      });
      onCleanup(() => subscription.dispose());
    },
    { immediate: true },
  );

  return markers;
}
