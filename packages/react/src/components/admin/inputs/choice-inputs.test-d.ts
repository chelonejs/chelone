/**
 * The choice inputs keep `TChoice` from their props through their body, so the
 * `optionText` formatter receives the inferred choice and `optionValue` is
 * checked against the paths of the inline choices.
 */

import { describe, expectTypeOf, it } from "vitest";
import { AutocompleteInput } from "./autocomplete-input";
import { CheckboxGroupInput } from "./checkbox-group-input";
import { SelectInput } from "./select-input";

type Author = { id: number; name: string; address: { city: string } };

const choices: Author[] = [{ id: 1, name: "Ada", address: { city: "London" } }];

describe("choice inputs keep TChoice", () => {
  it("SelectInput optionText formatter receives the inferred choice", () => {
    SelectInput({
      source: "author",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("AutocompleteInput optionText formatter receives the inferred choice", () => {
    AutocompleteInput({
      source: "author",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("CheckboxGroupInput optionText formatter receives the inferred choice", () => {
    CheckboxGroupInput({
      source: "authors",
      choices,
      optionText: (choice) => {
        expectTypeOf(choice).toEqualTypeOf<Author>();
        return choice.address.city;
      },
    });
  });

  it("optionValue rejects a path the choices lack", () => {
    SelectInput({
      source: "author",
      choices,
      // @ts-expect-error `ide` is not a path of Author
      optionValue: "ide",
    });
    AutocompleteInput({
      source: "author",
      choices,
      // @ts-expect-error `ide` is not a path of Author
      optionValue: "ide",
    });
    CheckboxGroupInput({
      source: "authors",
      choices,
      // @ts-expect-error `ide` is not a path of Author
      optionValue: "ide",
    });
  });
});
