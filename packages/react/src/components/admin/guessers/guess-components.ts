import type {
  FieldComponentName,
  FieldDescriptor,
  InputComponentName,
} from "@chelone/core";
import { createElement, type ReactElement } from "react";
import { BooleanField } from "../fields/boolean-field";
import { DateField } from "../fields/date-field";
import { EmailField } from "../fields/email-field";
import { NumberField } from "../fields/number-field";
import { ReferenceArrayField } from "../fields/reference-array-field";
import { ReferenceField } from "../fields/reference-field";
import { SelectField } from "../fields/select-field";
import { TextArrayField } from "../fields/text-array-field";
import { TextField } from "../fields/text-field";
import { UrlField } from "../fields/url-field";
import { BooleanInput } from "../inputs/boolean-input";
import { DateInput } from "../inputs/date-input";
import { DateTimeInput } from "../inputs/date-time-input";
import { NumberInput } from "../inputs/number-input";
import { ReferenceArrayInput } from "../inputs/reference-array-input";
import { ReferenceInput } from "../inputs/reference-input";
import { SelectInput } from "../inputs/select-input";
import { TextArrayInput } from "../inputs/text-array-input";
import { TextInput } from "../inputs/text-input";

type GuessElement = (field: FieldDescriptor) => ReactElement;

// A reference descriptor always carries its target; the empty fallback only
// keeps the type total, as the guessers' reference branches already do.
const referenceOf = (field: FieldDescriptor) => field.reference ?? "";

/**
 * Builds the field element each core `FieldComponentName` renders as. The
 * record is exhaustive: a name added in core fails typecheck here.
 */
export const guessFieldElements: Record<FieldComponentName, GuessElement> = {
  TextField: (field) =>
    createElement(TextField, { source: field.source, ...field.fieldProps }),
  EmailField: (field) =>
    createElement(EmailField, { source: field.source, ...field.fieldProps }),
  UrlField: (field) =>
    createElement(UrlField, { source: field.source, ...field.fieldProps }),
  NumberField: (field) =>
    createElement(NumberField, { source: field.source, ...field.fieldProps }),
  BooleanField: (field) =>
    createElement(BooleanField, { source: field.source, ...field.fieldProps }),
  DateField: (field) =>
    createElement(DateField, { source: field.source, ...field.fieldProps }),
  SelectField: (field) =>
    createElement(SelectField, {
      source: field.source,
      choices: field.choices,
      ...field.fieldProps,
    }),
  TextArrayField: (field) =>
    createElement(TextArrayField, {
      source: field.source,
      ...field.fieldProps,
    }),
  ReferenceField: (field) =>
    createElement(ReferenceField, {
      source: field.source,
      reference: referenceOf(field),
      ...field.fieldProps,
    }),
  ReferenceArrayField: (field) =>
    createElement(ReferenceArrayField, {
      source: field.source,
      reference: referenceOf(field),
      ...field.fieldProps,
    }),
};

/**
 * Builds the input element each core `InputComponentName` renders as, with the
 * descriptor's `label` when it has one.
 */
export const guessInputElements: Record<InputComponentName, GuessElement> = {
  TextInput: (field) =>
    createElement(TextInput, { source: field.source, label: field.label }),
  NumberInput: (field) =>
    createElement(NumberInput, { source: field.source, label: field.label }),
  BooleanInput: (field) =>
    createElement(BooleanInput, { source: field.source, label: field.label }),
  DateInput: (field) =>
    createElement(DateInput, { source: field.source, label: field.label }),
  DateTimeInput: (field) =>
    createElement(DateTimeInput, { source: field.source, label: field.label }),
  SelectInput: (field) =>
    createElement(SelectInput, {
      source: field.source,
      label: field.label,
      choices: field.choices,
    }),
  TextArrayInput: (field) =>
    createElement(TextArrayInput, {
      source: field.source,
      label: field.label,
    }),
  ReferenceInput: (field) =>
    createElement(ReferenceInput, {
      source: field.source,
      reference: referenceOf(field),
    }),
  ReferenceArrayInput: (field) =>
    createElement(ReferenceArrayInput, {
      source: field.source,
      reference: referenceOf(field),
    }),
};
