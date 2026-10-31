/**
 * The public surface of `@chelone/vue`: every component the barrel exports
 * ships its props type next to it, as `@chelone/react` does.
 */
import { describe, expectTypeOf, it } from "vitest";
import type {
  AdminProps,
  BooleanInputProps,
  BulkActionsToolbarProps,
  ColorInputProps,
  CreateProps,
  CurrencyInputProps,
  DataTableProps,
  DateInputProps,
  DateTimeInputProps,
  DurationInputProps,
  EditProps,
  FilterFormProps,
  InfiniteListProps,
  InfinitePaginationProps,
  ListPaginationProps,
  ListProps,
  LoadingPageProps,
  NullableBooleanInputProps,
  NumberInputProps,
  PasswordInputProps,
  PhoneInputProps,
  ReferenceFieldProps,
  ReferenceInputProps,
  ResettableTextInputProps,
  ResourceProps,
  SaveButtonProps,
  SavedQueriesListProps,
  SearchInputProps,
  ShowProps,
  Subscribable,
  TextFieldProps,
  TextInputProps,
  TimeInputProps,
  ToolbarProps,
  ValidationErrorProps,
} from "./index";
import * as barrel from "./index";

describe("@chelone/vue public exports", () => {
  it("exports each component's props type", () => {
    expectTypeOf<AdminProps>().toHaveProperty("dataProvider");
    expectTypeOf<BooleanInputProps>().toHaveProperty("source");
    expectTypeOf<BulkActionsToolbarProps>().toBeObject();
    expectTypeOf<ColorInputProps>().toHaveProperty("source");
    expectTypeOf<CreateProps>().toBeObject();
    expectTypeOf<CurrencyInputProps>().toHaveProperty("source");
    expectTypeOf<DataTableProps>().toBeObject();
    expectTypeOf<DateInputProps>().toHaveProperty("source");
    expectTypeOf<DateTimeInputProps>().toHaveProperty("source");
    expectTypeOf<DurationInputProps>().toHaveProperty("source");
    expectTypeOf<EditProps>().toBeObject();
    expectTypeOf<FilterFormProps>().toBeObject();
    expectTypeOf<InfiniteListProps>().toBeObject();
    expectTypeOf<InfinitePaginationProps>().toBeObject();
    expectTypeOf<ListProps>().toBeObject();
    expectTypeOf<ListPaginationProps>().toBeObject();
    expectTypeOf<LoadingPageProps>().toBeObject();
    expectTypeOf<NullableBooleanInputProps>().toHaveProperty("source");
    expectTypeOf<NumberInputProps>().toHaveProperty("source");
    expectTypeOf<PasswordInputProps>().toHaveProperty("source");
    expectTypeOf<PhoneInputProps>().toHaveProperty("source");
    expectTypeOf<ReferenceFieldProps>().toHaveProperty("source");
    expectTypeOf<ReferenceInputProps>().toHaveProperty("source");
    expectTypeOf<ResettableTextInputProps>().toHaveProperty("source");
    expectTypeOf<ResourceProps>().toHaveProperty("name");
    expectTypeOf<SaveButtonProps>().toBeObject();
    expectTypeOf<SavedQueriesListProps>().toBeObject();
    expectTypeOf<SearchInputProps>().toBeObject();
    expectTypeOf<ShowProps>().toBeObject();
    expectTypeOf<TextFieldProps>().toHaveProperty("source");
    expectTypeOf<TextInputProps>().toHaveProperty("source");
    expectTypeOf<TimeInputProps>().toHaveProperty("source");
    expectTypeOf<ToolbarProps>().toBeObject();
    expectTypeOf<ValidationErrorProps>().toBeObject();
  });

  it("exports the subscription helpers registry components import", () => {
    expectTypeOf(barrel).toHaveProperty("useSubscribable");
    expectTypeOf(barrel).toHaveProperty("subscribeStore");
    expectTypeOf<Subscribable<number>>().toBeObject();
  });

  it("keeps internal helpers out of the barrel", () => {
    expectTypeOf(barrel).not.toHaveProperty("areIdsEqual");
    expectTypeOf(barrel).not.toHaveProperty("WebhookEndpointFieldEndpoint");
  });
});
