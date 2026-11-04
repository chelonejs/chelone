import type { LooseRecord, SourcePath } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { genericMemo } from "@/lib/gen-memo";
import type { ChoiceRecord, OptionText } from "../../../choices-hooks";
import { useChoices } from "../../../choices-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

/**
 * Displays a value from an enumeration by mapping it to a human-readable label.
 *
 * Supports custom `optionText`/`optionValue` and automatic translation of
 * choice labels. To be used with `RecordField` or `DataTable.Col`, or anywhere
 * a `RecordContext` is available.
 *
 * @example
 * import { List, DataTable, SelectField } from '@/components/admin';
 *
 * const choices = [{ id: 'M', name: 'Male' }, { id: 'F', name: 'Female' }];
 *
 * const UserList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col>
 *         <SelectField source="gender" choices={choices} />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 *
 * The current choice is translated by default, so translation identifiers work
 * as choice labels. Set `translateChoice={false}` to opt out (e.g. inside a
 * `<ReferenceField>`, which defaults it to false).
 */
const SelectFieldImpl = <
  RecordType extends LooseRecord = LooseRecord,
  TChoice extends ChoiceRecord = ChoiceRecord,
>(
  typedProps: SelectFieldProps<RecordType, TChoice>,
) => {
  const {
    className,
    empty,
    choices,
    defaultValue,
    source,
    record,
    optionValue,
    optionText,
    translateChoice,
    ...rest
  } = typedProps;
  // Read through `LooseRecord`: the typed read is a `SourceValue` still deferred
  // on `RecordType`, which overflows the compiler when compared. It is `unknown`.
  const value = useFieldValue<LooseRecord>({ defaultValue, source, record });

  const { getChoiceText, getChoiceValue } = useChoices<TChoice>({
    optionText,
    optionValue,
    translateChoice,
  });
  const translate = useTranslate();

  const choice = choices
    ? choices.find((choice) => getChoiceValue(choice) === value)
    : undefined;

  if (!choice) {
    if (!empty) {
      return null;
    }

    return (
      <span className={className} {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const choiceText = getChoiceText(choice);

  return (
    <span className={className} {...sanitizeFieldRestProps(rest)}>
      {choiceText}
    </span>
  );
};

SelectFieldImpl.displayName = "SelectFieldImpl";

const SelectField = genericMemo(SelectFieldImpl);

interface SelectFieldProps<
  RecordType extends LooseRecord = LooseRecord,
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {
  /** The list of choices to map the value against. */
  choices?: readonly TChoice[];
  /** The value path on a choice. Default `'id'`. */
  optionValue?: SourcePath<TChoice>;
  /** The display path or a formatter. Default `'name'`. */
  optionText?: OptionText<TChoice>;
  /** Translate a string-path text through the catalog. Default `true`. */
  translateChoice?: boolean;
}

export { SelectField, type SelectFieldProps };
