import type { FieldComponentName, InputComponentName } from "@chelone/core";
import type { Component } from "vue";
import BooleanField from "../fields/boolean-field.vue";
import DateField from "../fields/date-field.vue";
import EmailField from "../fields/email-field.vue";
import NumberField from "../fields/number-field.vue";
import ReferenceArrayField from "../fields/reference-array-field.vue";
import ReferenceField from "../fields/reference-field.vue";
import SelectField from "../fields/select-field.vue";
import TextArrayField from "../fields/text-array-field.vue";
import TextField from "../fields/text-field.vue";
import UrlField from "../fields/url-field.vue";
import BooleanInput from "../inputs/boolean-input.vue";
import DateInput from "../inputs/date-input.vue";
import DateTimeInput from "../inputs/date-time-input.vue";
import NumberInput from "../inputs/number-input.vue";
import ReferenceArrayInput from "../inputs/reference-array-input.vue";
import ReferenceInput from "../inputs/reference-input.vue";
import SelectInput from "../inputs/select-input.vue";
import TextArrayInput from "../inputs/text-array-input.vue";
import TextInput from "../inputs/text-input.vue";

/**
 * The component each described field renders as. Each SFC is imported from its
 * own file, never a barrel, so a guesser installs only what it uses. The
 * `Record` type makes a name added in core fail `vue-tsc` here until it is mapped.
 */
export const guessFieldComponents: Record<FieldComponentName, Component> = {
  TextField,
  EmailField,
  UrlField,
  NumberField,
  BooleanField,
  DateField,
  SelectField,
  TextArrayField,
  ReferenceField,
  ReferenceArrayField,
};

/** The component each described field edits with. */
export const guessInputComponents: Record<InputComponentName, Component> = {
  TextInput,
  NumberInput,
  BooleanInput,
  DateInput,
  DateTimeInput,
  SelectInput,
  TextArrayInput,
  ReferenceInput,
  ReferenceArrayInput,
};
