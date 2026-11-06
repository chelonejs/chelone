import { type FieldData, toFieldName } from "./field-name";
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
    // type-escape: the value under that key is the form's value at it
    form.setFieldValue(toFieldName<TValues>(key), value as FieldData<TValues>);
  }
}
