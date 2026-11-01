import type { FieldComponentName, InputComponentName } from "@chelone/core";
import type { ComponentType } from "react";
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

// A descriptor's props are only known at runtime, so each component is held
// untyped. The record is exhaustive: a name added in core fails typecheck here.
const untyped = <P>(component: ComponentType<P>) =>
  component as unknown as ComponentType;

/** The field component each core `FieldComponentName` renders as. */
export const guessFieldComponents: Record<FieldComponentName, ComponentType> = {
  TextField: untyped(TextField),
  EmailField: untyped(EmailField),
  UrlField: untyped(UrlField),
  NumberField: untyped(NumberField),
  BooleanField: untyped(BooleanField),
  DateField: untyped(DateField),
  SelectField: untyped(SelectField),
  TextArrayField: untyped(TextArrayField),
  ReferenceField: untyped(ReferenceField),
  ReferenceArrayField: untyped(ReferenceArrayField),
};

/** The input component each core `InputComponentName` renders as. */
export const guessInputComponents: Record<InputComponentName, ComponentType> = {
  TextInput: untyped(TextInput),
  NumberInput: untyped(NumberInput),
  BooleanInput: untyped(BooleanInput),
  DateInput: untyped(DateInput),
  DateTimeInput: untyped(DateTimeInput),
  SelectInput: untyped(SelectInput),
  TextArrayInput: untyped(TextArrayInput),
  ReferenceInput: untyped(ReferenceInput),
  ReferenceArrayInput: untyped(ReferenceArrayInput),
};
