import type { Identifier } from "@chelone/core";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ChoiceRecord, OptionText } from "../../../choices-hooks";
import { useChoices, useChoicesContext } from "../../../choices-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import type { InputProps } from "../input-props";

type DatagridInputProps = Omit<
  InputProps,
  "source" | "disabled" | "readOnly"
> & {
  /** Inline choices (records) — omit inside a `<ReferenceArrayInput>`. */
  choices?: readonly ChoiceRecord[];
  /** The display path or a formatter for a choice. Default `"name"`. */
  optionText?: OptionText;
  /** The value path on a choice. Default `"id"`. */
  optionValue?: string;
  /** Translate the choice text through the catalog. */
  translateChoice?: boolean;
  /** The FK-array field; supplied ambiently inside a `<ReferenceArrayInput>`. */
  source?: string;
  /** Override the ambient resource. */
  resource?: string;
  /** Extra classes on the wrapper. */
  className?: string;
  /** Column header for the choice column. Default the resource/source label. */
  optionLabel?: ReactNode;
};

/**
 * Form input that renders a list of records as a selectable table — the user
 * ticks row checkboxes and the form value is the array of selected record ids.
 *
 * Typically used as a child of `<ReferenceArrayInput>` (choices + resource come
 * from the ambient choices context); can also take an inline `choices` prop for
 * static data. Rebridged onto chelone's `useChoicesContext` (choices) +
 * `useInput` (the id-array form binding) — the selection lives on the form
 * value, not a separate list-selection store, so no `<DataTable>`/list
 * controller is needed.
 *
 * @experimental A simplified port: row selection + select-all only. Filtering,
 * pagination, and the create-suggestion flow are not wired.
 *
 * @example
 * import { Edit, ReferenceArrayInput, DatagridInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <ReferenceArrayInput source="tag_ids" reference="tags">
 *       <DatagridInput />
 *     </ReferenceArrayInput>
 *   </Edit>
 * );
 */
function DatagridInput(props: DatagridInputProps): ReactNode {
  const {
    choices,
    className,
    source: sourceProp,
    helperText,
    optionText = "name",
    optionValue = "id",
    translateChoice,
    optionLabel,
  } = props;

  const {
    availableChoices = [],
    source,
    isFromReference,
  } = useChoicesContext({ choices, source: sourceProp });

  const finalSource = source ?? sourceProp ?? "";
  if (finalSource === "") {
    throw new Error(
      "If you're not wrapping the DatagridInput inside a ReferenceArrayInput, you must provide the source prop",
    );
  }

  // `resource`/`disabled`/`readOnly` are component-local, NOT `useInput` keys.
  const { field, fieldState } = useInput({
    source: finalSource,
    defaultValue: props.defaultValue,
    format: props.format,
    onBlur: props.onBlur,
    onChange: props.onChange,
    parse: props.parse,
    validate: props.validate,
  });
  const translate = useTranslate();

  const { getChoiceText, getChoiceValue } = useChoices({
    optionText,
    optionValue,
    translateChoice: translateChoice ?? !isFromReference,
  });

  const selectedIds = useMemo<Identifier[]>(
    () => (Array.isArray(field.value) ? (field.value as Identifier[]) : []),
    [field.value],
  );

  const isSelected = useCallback(
    (id: Identifier) => selectedIds.some((v) => String(v) === String(id)),
    [selectedIds],
  );

  const toggle = useCallback(
    (id: Identifier) => {
      field.onChange(
        isSelected(id)
          ? selectedIds.filter((v) => String(v) !== String(id))
          : [...selectedIds, id],
      );
    },
    [field, isSelected, selectedIds],
  );

  const allIds = useMemo<Identifier[]>(
    () => availableChoices.map((c) => getChoiceValue(c) as Identifier),
    [availableChoices, getChoiceValue],
  );
  const allSelected = allIds.length > 0 && allIds.every((id) => isSelected(id));

  const toggleAll = useCallback(() => {
    field.onChange(allSelected ? [] : allIds);
  }, [field, allSelected, allIds]);

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  // shadmin routed it through `InputHelperText`; here it renders as a proper
  // `role="alert"` `<FieldError>` (matching the sibling choice inputs), so a
  // required/minLength failure on the id-array is surfaced instead of silent.
  const error = fieldState.error;

  return (
    <div
      className={cn("ra-input", `ra-input-${finalSource}`, className)}
      data-slot="datagrid-input"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label={translate("ra.action.select_all", {
                  _: "Select all",
                })}
                aria-invalid={invalid || undefined}
              />
            </TableHead>
            <TableHead>{optionLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availableChoices.map((choice) => {
            const id = getChoiceValue(choice) as Identifier;
            return (
              <TableRow
                key={String(id)}
                data-state={isSelected(id) && "selected"}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected(id)}
                    onCheckedChange={() => toggle(id)}
                    aria-label={translate("ra.action.select_row", {
                      _: "Select this row",
                    })}
                  />
                </TableCell>
                <TableCell>{getChoiceText(choice)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </div>
  );
}

export { DatagridInput, type DatagridInputProps };
