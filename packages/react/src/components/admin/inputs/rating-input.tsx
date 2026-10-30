import type * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import type { InputProps } from "../input-props";

/**
 * N-star rating input for a `number` value (0..max), with optional half-step
 * granularity.
 *
 * Keyboard/AT accessible: the group is `role="radiogroup"` and each star is a
 * `button[role="radio"]` reporting `aria-checked`. Wraps shadcn's `<FieldSet>`
 * / `<FieldLegend>` for the label + error slots.
 *
 * @example
 * import { Edit, RatingInput } from '@/components/admin';
 *
 * const ReviewEdit = () => (
 *   <Edit>
 *     <RatingInput source="rating" allowHalf max={5} />
 *   </Edit>
 * );
 */
function RatingInput(props: RatingInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    max = 5,
    allowHalf = false,
    disabled,
    ...rest
  } = props;
  const resource = useResourceContext({ resource: resourceProp });
  // Pass the already-destructured `...rest` (presentational keys removed) plus
  // `source` explicitly, so label/className/max/allowHalf/etc. don't pollute
  // `validatorMeta`. `defaultValue`/`validate`/`format`/`parse` remain in `rest`.
  const { id, field, fieldState, isRequired } = useInput({ ...rest, source });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const steps = allowHalf ? max * 2 : max;
  const stepValue = allowHalf ? 0.5 : 1;
  const currentValue = (field.value as number | null | undefined) ?? 0;

  return (
    <FieldSet
      className={cn("gap-3", className)}
      data-invalid={invalid || undefined}
    >
      {label !== false && (
        <FieldLegend variant="label">
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLegend>
      )}
      <div
        id={id}
        role="radiogroup"
        aria-disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn("flex items-center gap-1", className)}
        {...sanitizeInputRestProps(rest as Record<string, unknown>)}
      >
        {Array.from({ length: steps }).map((_, i) => {
          const v = (i + 1) * stepValue;
          const selected = currentValue >= v;
          return (
            // biome-ignore lint/a11y/useSemanticElements: custom star visuals can't be rendered with native <input type="radio">; button[role=radio] inside the role="radiogroup" is the standard accessible rating pattern
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => !disabled && field.onChange(v)}
              onBlur={field.onBlur}
              className={cn(
                "p-0.5 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Star filled={selected} half={allowHalf && v % 1 !== 0} />
            </button>
          );
        })}
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}

const Star = ({ filled, half }: { filled: boolean; half: boolean }) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    fill={filled ? "currentColor" : "none"}
    className="text-yellow-500"
    aria-hidden="true"
  >
    <polygon
      points={
        half
          ? "12 2 12 17 6 22 8 14 2 9 9 9"
          : "12 2 15 9 22 9 16 14 18 22 12 17 6 22 8 14 2 9 9 9"
      }
    />
  </svg>
);

interface RatingInputProps
  extends InputProps,
    Omit<React.ComponentProps<"div">, "defaultValue" | "onBlur" | "onChange"> {
  max?: number;
  allowHalf?: boolean;
  disabled?: boolean;
}

export { RatingInput, type RatingInputProps };
