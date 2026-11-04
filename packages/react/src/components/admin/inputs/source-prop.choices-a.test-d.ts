/**
 * The four select and autocomplete inputs read `optionText`, `optionValue` and
 * `disableValue` as paths of the inline `choices`. Under a `ReferenceInput`
 * there are no `choices`, so the paths stay `string`.
 */

import { describe, it } from "vitest";
import { AutocompleteArrayInput } from "./autocomplete-array-input";
import { AutocompleteInput } from "./autocomplete-input";
import { SelectArrayInput } from "./select-array-input";
import { SelectInput } from "./select-input";

const choices = [{ id: 1, label: "One", off: false }];

describe("SelectInput choices paths", () => {
  it("optionText, optionValue and disableValue accept a path of the inline choices", () => {
    SelectInput({
      source: "kind",
      choices,
      optionText: "label",
      optionValue: "id",
      disableValue: "off",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    SelectInput({
      source: "kind",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("optionText accepts a function over the choice type", () => {
    SelectInput({
      source: "kind",
      choices,
      optionText: (choice) => choice.label.toUpperCase(),
    });
  });

  it("without choices the paths take any string", () => {
    SelectInput({
      source: "kind",
      optionText: "anyKey",
      optionValue: "anyKey",
      disableValue: "anyKey",
    });
  });
});

describe("SelectArrayInput choices paths", () => {
  it("optionText, optionValue and disableValue accept a path of the inline choices", () => {
    SelectArrayInput({
      source: "kinds",
      choices,
      optionText: "label",
      optionValue: "id",
      disableValue: "off",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    SelectArrayInput({
      source: "kinds",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("optionText accepts a function over the choice type", () => {
    SelectArrayInput({
      source: "kinds",
      choices,
      optionText: (choice) => choice.label.toUpperCase(),
    });
  });

  it("without choices the paths take any string", () => {
    SelectArrayInput({
      source: "kinds",
      optionText: "anyKey",
      optionValue: "anyKey",
      disableValue: "anyKey",
    });
  });
});

describe("AutocompleteInput choices paths", () => {
  it("optionText, optionValue and disableValue accept a path of the inline choices", () => {
    AutocompleteInput({
      source: "kind",
      choices,
      optionText: "label",
      optionValue: "id",
      disableValue: "off",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    AutocompleteInput({
      source: "kind",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("optionText accepts a function over the choice type", () => {
    AutocompleteInput({
      source: "kind",
      choices,
      optionText: (choice) => choice.label.toUpperCase(),
    });
  });

  it("without choices the paths take any string", () => {
    AutocompleteInput({
      source: "kind",
      optionText: "anyKey",
      optionValue: "anyKey",
      disableValue: "anyKey",
    });
  });
});

describe("AutocompleteArrayInput choices paths", () => {
  it("optionText, optionValue and disableValue accept a path of the inline choices", () => {
    AutocompleteArrayInput({
      source: "kinds",
      choices,
      optionText: "label",
      optionValue: "id",
      disableValue: "off",
    });
  });

  it("optionText rejects a path that is not on the choices", () => {
    AutocompleteArrayInput({
      source: "kinds",
      choices,
      // @ts-expect-error `lable` is not a path of the choices
      optionText: "lable",
    });
  });

  it("optionText accepts a function over the choice type", () => {
    AutocompleteArrayInput({
      source: "kinds",
      choices,
      optionText: (choice) => choice.label.toUpperCase(),
    });
  });

  it("without choices the paths take any string", () => {
    AutocompleteArrayInput({
      source: "kinds",
      optionText: "anyKey",
      optionValue: "anyKey",
      disableValue: "anyKey",
    });
  });
});
