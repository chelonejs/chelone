/**
 * The shadcn `Field` family, the Vue analog of `@chelone/react`'s `ui/field.tsx`
 * (`Field` / `FieldLabel` / `FieldError` / `FieldDescription`). These are pure
 * structural wrappers (no interactivity), so they are authored as small
 * `defineComponent` render components in one module rather than a directory of
 * one-line SFCs — the minimal, dependency-free slice the admin inputs need.
 */

import { defineComponent, h, type PropType } from "vue";
import { cn } from "../../lib/utils";

/** The input field wrapper — a vertical stack of label + control + error. */
export const Field = defineComponent({
  name: "Field",
  props: {
    class: { type: String, default: "" },
    dataInvalid: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "data-slot": "field",
          "data-invalid": props.dataInvalid || undefined,
          class: cn("flex flex-col gap-2", props.class),
        },
        slots.default?.(),
      );
  },
});

/** The field label — `<label for>` bound to the control's id. */
export const FieldLabel = defineComponent({
  name: "FieldLabel",
  props: {
    htmlFor: { type: String, default: undefined },
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "label",
        {
          "data-slot": "field-label",
          for: props.htmlFor,
          class: cn(
            "flex items-center gap-2 text-sm font-medium leading-none",
            props.class,
          ),
        },
        slots.default?.(),
      );
  },
});

/** The field error slot — rendered below the control (red text). */
export const FieldError = defineComponent({
  name: "FieldError",
  props: { class: { type: String, default: "" } },
  setup(props, { slots }) {
    return () => {
      const content = slots.default?.();
      if (content == null) return null;
      return h(
        "p",
        {
          "data-slot": "field-error",
          class: cn("text-sm font-medium text-destructive", props.class),
        },
        content,
      );
    };
  },
});

/** The field description / helper text. */
export const FieldDescription = defineComponent({
  name: "FieldDescription",
  props: { class: { type: String as PropType<string>, default: "" } },
  setup(props, { slots }) {
    return () =>
      h(
        "p",
        {
          "data-slot": "field-description",
          class: cn("text-sm text-muted-foreground", props.class),
        },
        slots.default?.(),
      );
  },
});
