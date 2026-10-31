/**
 * The public surface of `@chelone/vue`: every component the barrel exports
 * ships its props type next to it, as `@chelone/react` does.
 */
import { describe, expectTypeOf, it } from "vitest";
import type { Ref } from "vue";
import type {
  AdminProps,
  BooleanInputProps,
  BulkActionsToolbarProps,
  ColorInputProps,
  CreateProps,
  CurrencyInputProps,
  DataTableColProps,
  DataTableNumberColProps,
  DataTableProps,
  DateInputProps,
  DateTimeInputProps,
  DurationInputProps,
  EditProps,
  ErrorFallbackProps,
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
    expectTypeOf<DataTableColProps>().toBeObject();
    expectTypeOf<DataTableNumberColProps>().toHaveProperty("source");
    expectTypeOf<DataTableProps>().toBeObject();
    expectTypeOf<DateInputProps>().toHaveProperty("source");
    expectTypeOf<DateTimeInputProps>().toHaveProperty("source");
    expectTypeOf<DurationInputProps>().toHaveProperty("source");
    expectTypeOf<ErrorFallbackProps>().toHaveProperty("error");
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

  it("useStore is useStoreItem and returns a ref and a setter", () => {
    expectTypeOf(barrel.useStore).toEqualTypeOf(barrel.useStoreItem);
    expectTypeOf(barrel.useStoreItem<boolean>).returns.toEqualTypeOf<
      [Readonly<Ref<boolean | undefined>>, (value: boolean) => void]
    >();
  });

  it("keeps internal helpers out of the barrel", () => {
    expectTypeOf(barrel).not.toHaveProperty("areIdsEqual");
    expectTypeOf(barrel).not.toHaveProperty("WebhookEndpointFieldEndpoint");
  });
});
