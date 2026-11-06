import type { DeepKeys, DeepValue } from "@tanstack/form-core";
import type { CheloneFormApi } from "./form-controller";

/**
 * Writes each key of `data` into the form, so a programmatic save sees the
 * values it was handed. A key not in `data` keeps its value.
 */
export function setFormValues<TValues>(
  form: CheloneFormApi<TValues>,
  data: Partial<NoInfer<TValues>>,
): void {
  for (const [key, value] of Object.entries(data)) {
    // type-escape: a key of `data` is a top-level key of the form data, which the compiler cannot see while TValues is open
    const name = key as DeepKeys<TValues>;
    // type-escape: the value under that key is the form's value at it
    form.setFieldValue(name, value as DeepValue<TValues, DeepKeys<TValues>>);
  }
}
