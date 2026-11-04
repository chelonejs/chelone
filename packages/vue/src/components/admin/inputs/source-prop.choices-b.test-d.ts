/**
 * The remaining components that take inline `choices` read `optionText`,
 * `optionValue` and `disableValue` as paths of those choices. Under a reference
 * wrapper there are no `choices`, so the paths stay `string`.
 *
 * Vue has no `DatagridInput`, so `<SelectField>` is the one that only has
 * `optionText` and `optionValue`.
 */

import { describe, it } from "vitest";
import SelectField from "../fields/select-field.vue";
import CheckboxGroupInput from "./checkbox-group-input.vue";
import RadioButtonGroupInput from "./radio-button-group-input.vue";

const choices = [{ id: 1, label: "One", off: false }];

describe("CheckboxGroupInput choices paths", () => {
  it("optionText, optionValue and disableValue accept a path of the inline choices", () => {
    CheckboxGroupInput({
      source: "tags",
      choices,
      optionText: "label",
      optionValue: "id",
      disableValue: "off",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    CheckboxGroupInput({
      source: "tags",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("without choices the paths take any string", () => {
    CheckboxGroupInput({
      source: "tags",
      optionText: "anyKey",
      optionValue: "anyKey",
      disableValue: "anyKey",
    });
  });
});

describe("RadioButtonGroupInput choices paths", () => {
  it("optionText, optionValue and disableValue accept a path of the inline choices", () => {
    RadioButtonGroupInput({
      source: "category",
      choices,
      optionText: "label",
      optionValue: "id",
      disableValue: "off",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    RadioButtonGroupInput({
      source: "category",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("without choices the paths take any string", () => {
    RadioButtonGroupInput({
      source: "category",
      optionText: "anyKey",
      optionValue: "anyKey",
      disableValue: "anyKey",
    });
  });
});

describe("SelectField choices paths", () => {
  it("optionText and optionValue accept a path of the inline choices", () => {
    SelectField({
      source: "kind",
      choices,
      optionText: "label",
      optionValue: "id",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    SelectField({
      source: "kind",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("without choices the paths take any string", () => {
    SelectField({
      source: "kind",
      optionText: "anyKey",
      optionValue: "anyKey",
    });
  });
});
