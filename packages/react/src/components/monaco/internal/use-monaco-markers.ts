import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import { type RefObject, useEffect, useRef } from "react";

/**
 * Keeps the editor model's current markers in a ref and calls `onChange` each
 * time Monaco reports a change for that model. The ref is what a validator
 * reads, so it never goes stale between renders.
 */
export function useMonacoMarkers(
  instance: editor.IStandaloneCodeEditor | null,
  monaco: typeof Monaco | null,
  onChange: (markers: editor.IMarker[]) => void,
): RefObject<editor.IMarker[]> {
  const markers = useRef<editor.IMarker[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const model = instance?.getModel();
    if (!instance || !monaco || !model) return;
    const read = () => monaco.editor.getModelMarkers({ resource: model.uri });
    markers.current = read();
    const subscription = monaco.editor.onDidChangeMarkers((uris) => {
      if (!uris.some((uri) => uri.toString() === model.uri.toString())) return;
      markers.current = read();
      onChangeRef.current(markers.current);
    });
    return () => subscription.dispose();
  }, [instance, monaco]);

  return markers;
}
