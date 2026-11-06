import { type LooseRecord, type SourceProp, toTextValue } from "@chelone/core";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * A subscription plan a `<SubscriptionPlanPicker>` renders. Inlined here (the
 * shadmin source imported it from a sibling `subscription-plan-field`; that
 * field is not yet ported to @chelone/react) and re-exported.
 */
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features?: readonly string[];
}

/**
 * Card-grid plan picker. One card per `plans` entry, clicking a card writes
 * its `id` to the form field. Highlights the current plan and (optionally)
 * a recommended plan.
 *
 * @example
 * import { SubscriptionPlanPicker } from '@chelone/react';
 *
 * <SubscriptionPlanPicker
 *   source="planId"
 *   plans={PLANS}
 *   recommendedPlanId="pro"
 * />
 */
function SubscriptionPlanPicker<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
>(props: SubscriptionPlanPickerProps<TRecord, TPath>) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    plans,
    recommendedPlanId,
    disabled,
    ...inputProps
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  // The options are spread whole: reading the generic `defaultValue` anywhere
  // makes the compiler resolve `SourceValue`'s constraint, which exceeds the
  // instantiation depth. The component's own generics go to `useInput` so
  // `format` and `parse` are typed by the value at `source`.
  const { id, field, fieldState, isRequired } = useInput<TRecord, TPath>({
    ...inputProps,
    source,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const currentId = toTextValue(field.value);

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
        className="grid gap-3 sm:grid-cols-3"
        aria-disabled={disabled}
        aria-invalid={invalid || undefined}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={currentId === plan.id}
            recommended={recommendedPlanId === plan.id}
            disabled={disabled}
            onSelect={() => !disabled && field.onChange(plan.id)}
          />
        ))}
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  selected: boolean;
  recommended: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

const PlanCard = ({
  plan,
  selected,
  recommended,
  disabled,
  onSelect,
}: PlanCardProps) => {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
  }).format(plan.price);

  return (
    <Card
      data-plan-card={plan.id}
      data-selected={selected ? "true" : "false"}
      data-recommended={recommended ? "true" : "false"}
      className={cn(
        "transition",
        selected && "border-primary ring-2 ring-primary",
        recommended && !selected && "border-primary/50",
      )}
      role="radio"
      aria-checked={selected}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{plan.name}</span>
          {recommended && (
            <span className="rounded bg-primary px-2 py-0.5 text-primary-foreground text-xs">
              Recommended
            </span>
          )}
        </CardTitle>
        <div className="font-semibold text-2xl tabular-nums">
          {formatted}
          <span className="font-normal text-muted-foreground text-sm">
            /{plan.interval}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {plan.features && (
          <ul className="space-y-1 text-muted-foreground text-sm">
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          className="mt-4 w-full"
          variant={selected ? "default" : "outline"}
          onClick={onSelect}
          disabled={disabled}
        >
          {selected ? "Current" : "Select"}
        </Button>
      </CardContent>
    </Card>
  );
};

interface SubscriptionPlanPickerProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends InputProps<TRecord, TPath> {
  plans: readonly SubscriptionPlan[];
  recommendedPlanId?: string;
  disabled?: boolean;
  className?: string;
}

export {
  type SubscriptionPlan,
  SubscriptionPlanPicker,
  type SubscriptionPlanPickerProps,
};
