import { useCallback } from "react";
import { useCheloneFormContext, useWrappedSource } from "../form-context";
import { useWatch } from "./rhf-shim";

/**
 * The clear-button wiring the resettable inputs share: watch the ambient form's
 * value at `source` and hand back whether it holds text, plus a function that
 * writes an empty string back to it.
 *
 * Both halves resolve `source` through the ambient `SourceContext`, so an
 * iterator row reads and writes the row's own absolute path.
 */
export function useClearableFieldValue(source: string): {
  hasValue: boolean;
  clearFieldValue: () => void;
} {
  const { ambient } = useCheloneFormContext().form;
  const wrappedSource = useWrappedSource(source);
  const fieldValue = useWatch({ name: source });
  const hasValue = fieldValue != null && fieldValue !== "";
  const clearFieldValue = useCallback(() => {
    ambient.setFieldValue(wrappedSource, "");
  }, [ambient, wrappedSource]);

  return { hasValue, clearFieldValue };
}
