/**
 * The remaining components that take inline `choices` read `optionText`,
 * `optionValue` and `disableValue` as paths of those choices. Under a reference
 * wrapper there are no `choices`, so the paths stay `string`.
 *
 * `<DatagridInput>` and `<SelectField>` have no `disableValue` of their own.
 * Vue's `<DatagridInput>` still accepts `disableValue` because it comes from
 * the shared `ChoiceInputBaseProps`, and never reads it. The `it` names match
 * the acceptance-criterion lines, so the two components with a `disableValue`
 * of their own test it in a separate case.
 */

import { describe, it } from "vitest";
import SelectField from "../fields/select-field.vue";
import CheckboxGroupInput from "./checkbox-group-input.vue";
import DatagridInput from "./datagrid-input.vue";
import RadioButtonGroupInput from "./radio-button-group-input.vue";

const choices = [{ id: 1, label: "One", off: false }];

describe("CheckboxGroupInput choices paths", () => {
  it("optionText and optionValue accept a path of the inline choices", () => {
    CheckboxGroupInput({
      source: "tags",
      choices,
      optionText: "label",
      optionValue: "id",
    });
  });

  it("disableValue accepts a path of the inline choices", () => {
    CheckboxGroupInput({
      source: "tags",
      choices,
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

describe("DatagridInput choices paths", () => {
  it("optionText and optionValue accept a path of the inline choices", () => {
    DatagridInput({
      source: "tag_ids",
      choices,
      optionText: "label",
      optionValue: "id",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    DatagridInput({
      source: "tag_ids",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("without choices the paths take any string", () => {
    DatagridInput({
      source: "tag_ids",
      optionText: "anyKey",
      optionValue: "anyKey",
    });
  });
});

describe("RadioButtonGroupInput choices paths", () => {
  it("optionText and optionValue accept a path of the inline choices", () => {
    RadioButtonGroupInput({
      source: "category",
      choices,
      optionText: "label",
      optionValue: "id",
    });
  });

  it("disableValue accepts a path of the inline choices", () => {
    RadioButtonGroupInput({
      source: "category",
      choices,
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
