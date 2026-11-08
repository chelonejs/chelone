import {
  type ArrayItemOf,
  type ItemDefaultsOf,
  isRequired,
  type LooseRecord,
  type SourceProp,
  type Validator,
} from "@chelone/core";
import { Children, type ReactNode } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ArrayInputProvider, useArrayInput } from "../../../array-hooks";
import { ValidationError } from "../../../field-error-display";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import {
  ArrayInputAddLabelContext,
  ArrayInputResultContext,
} from "./array-input-context";

interface ArrayInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> {
  /** The array field path RELATIVE to the ambient source scope. */
  source: TPath;
  /**
   * The input label. A string is translated; a ReactNode renders as-is;
   * `false` renders no label.
   */
  label?: ReactNode | false;
  /** Override the ambient resource (label-key resolution). */
  resource?: string;
  /** Helper text rendered below the iterator; a string is translated. */
  helperText?: ReactNode | false;
  /** Array-level validators (e.g. `minLength`) — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /** The array's default value (seeds an untouched hole). */
  defaultValue?: readonly ArrayItemOf<RecordType, TPath>[];
  /** Force scalar-row mode (a `string[]`/`number[]`); DETECTED when omitted. */
  scalar?: boolean;
  /** Object-row defaults merged into a new row (object mode). */
  itemDefaults?: ItemDefaultsOf<ArrayItemOf<RecordType, TPath>>;
  /** Extra classes on the field wrapper. */
  className?: string;
  /** Label for the add-row button; a string is translated. */
  addLabel?: ReactNode;
  /**
   * The iterator that renders the rows: map `useArrayInputResult().rows` to
   * `<ArrayInputRow>`s.
   */
  children: ReactNode;
}

/**
 * True when a direct child carries the static `ownsAddButton` marker (a
 * `<SimpleFormIterator>`), so the built-in Add button would be a second one. A
 * wrapper component around the iterator does not carry the marker.
 */
function childOwnsAddButton(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      typeof child === "object" &&
      "type" in child &&
      typeof child.type === "function" &&
      "ownsAddButton" in child.type &&
      child.type.ownsAddButton === true,
  );
}

/**
 * Creates a list of sub-forms for editing arrays of data embedded inside a
 * record (order items, tags, any repeatable embedded data).
 *
 * Rebridged onto chelone's `useArrayInput` (the 4R array binding): `<ArrayInput>`
 * owns the SINGLE binding for the field, renders the label/error chrome, scopes
 * children under the array path via `<ArrayInputProvider>`, and exposes the full
 * iterator result to its child iterator through the
 * ambient array-input context. Requires an iterator child that maps the rows to
 * `<ArrayInputRow>`s, which scope each row's inputs and render its remove and
 * reorder controls. `<ArrayInput>` renders the add button unless its direct
 * child is a `<SimpleFormIterator>`, which brings its own.
 *
 * @example
 * import {
 *   Edit, TextInput, NumberInput, ArrayInput, ArrayInputRow,
 *   useArrayInputResult,
 * } from '@/components/admin';
 *
 * const ItemRows = () => {
 *   const { rows } = useArrayInputResult();
 *   return rows.map((row) => (
 *     <ArrayInputRow key={row.id} row={row}>
 *       <TextInput source="name" />
 *       <NumberInput source="price" />
 *     </ArrayInputRow>
 *   ));
 * };
 *
 * const OrderEdit = () => (
 *   <Edit>
 *     <ArrayInput source="items">
 *       <ItemRows />
 *     </ArrayInput>
 *   </Edit>
 * );
 */
function ArrayInput<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
>(props: ArrayInputProps<RecordType, TPath>): ReactNode {
  const {
    className,
    defaultValue = [],
    label,
    children,
    helperText,
    addLabel,
    resource: resourceFromProps,
    source: arraySource,
    validate,
    scalar,
    itemDefaults,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  const translate = useTranslate();

  const array = useArrayInput({
    source: arraySource,
    defaultValue,
    validate,
    scalar,
    itemDefaults,
  });

  const { fieldState, source: finalSource } = array;
  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  return (
    <Field
      className={cn(
        "ra-input",
        `ra-input-${finalSource}`,
        "flex w-full flex-col gap-2",
        className,
      )}
      data-invalid={invalid || undefined}
      {...sanitizeInputRestProps(rest)}
    >
      {label !== false && (
        <FieldLabel className="text-muted-foreground text-sm">
          <FieldLabelText
            label={label}
            source={arraySource}
            resource={resourceFromProps ?? resource}
            isRequired={validate !== undefined && isRequired(validate)}
          />
        </FieldLabel>
      )}
      <ArrayInputResultContext.Provider value={array}>
        <ArrayInputAddLabelContext.Provider value={addLabel}>
          <ArrayInputProvider array={array}>{children}</ArrayInputProvider>
        </ArrayInputAddLabelContext.Provider>
      </ArrayInputResultContext.Provider>
      {!childOwnsAddButton(children) && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-slot="array-input-add"
            onClick={() => array.add()}
          >
            {addLabel == null
              ? translate("chelone.action.add", { _: "Add" })
              : typeof addLabel === "string"
                ? translate(addLabel, { _: addLabel })
                : addLabel}
          </Button>
        </div>
      )}
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { ArrayInput, type ArrayInputProps };
