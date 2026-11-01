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
  CountProps,
  CreateProps,
  CurrencyInputProps,
  CustomRoute,
  DataTableColProps,
  DataTableNumberColProps,
  DataTableProps,
  DateInputProps,
  DateTimeInputProps,
  DurationInputProps,
  EditProps,
  ErrorFallbackProps,
  FilterFormEntry,
  FilterFormProps,
  FilterListItemProps,
  FilterListProps,
  FilterListSectionProps,
  FilterLiveSearchProps,
  HideOnScrollProps,
  IconButtonWithTooltipProps,
  InfiniteListProps,
  InfinitePaginationProps,
  LinkProps,
  ListActionsProps,
  ListNoResultsProps,
  ListPaginationProps,
  ListProps,
  ListToolbarProps,
  LoadingIndicatorProps,
  LoadingPageProps,
  NullableBooleanInputProps,
  NumberInputProps,
  PasswordInputProps,
  PhoneInputProps,
  PlaceholderProps,
  ReferenceFieldProps,
  ReferenceInputProps,
  ResettableTextInputProps,
  ResourceProps,
  SaveButtonProps,
  SavedQueriesListProps,
  SearchInputProps,
  ShowProps,
  SimpleListItemProps,
  SimpleListLoadingProps,
  SimpleListProps,
  SingleFieldListProps,
  Subscribable,
  TextFieldProps,
  TextInputProps,
  TimeInputProps,
  ToolbarProps,
  TopToolbarProps,
  ValidationErrorProps,
} from "./index";
import * as barrel from "./index";

describe("@chelone/vue public exports", () => {
  it("exports each component's props type", () => {
    expectTypeOf<AdminProps>().toHaveProperty("dataProvider");
    expectTypeOf<AdminProps>().toHaveProperty("customRoutes");
    expectTypeOf<CustomRoute>().toHaveProperty("path");
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
    expectTypeOf<CountProps>().toBeObject();
    expectTypeOf<EditProps>().toBeObject();
    expectTypeOf<FilterFormEntry>().toHaveProperty("component");
    expectTypeOf<FilterFormProps>().toBeObject();
    expectTypeOf<FilterLiveSearchProps>().toBeObject();
    expectTypeOf<HideOnScrollProps>().toHaveProperty("threshold");
    expectTypeOf<IconButtonWithTooltipProps>().toHaveProperty("label");
    expectTypeOf<InfiniteListProps>().toBeObject();
    expectTypeOf<FilterListItemProps>().toHaveProperty("value");
    expectTypeOf<FilterListProps>().toHaveProperty("label");
    expectTypeOf<FilterListSectionProps>().toHaveProperty("label");
    expectTypeOf<InfinitePaginationProps>().toBeObject();
    expectTypeOf<LinkProps>().toHaveProperty("to");
    expectTypeOf<ListActionsProps>().toBeObject();
    expectTypeOf<ListProps>().toBeObject();
    expectTypeOf<ListNoResultsProps>().toBeObject();
    expectTypeOf<ListPaginationProps>().toBeObject();
    expectTypeOf<ListToolbarProps>().toBeObject();
    expectTypeOf<LoadingIndicatorProps>().toBeObject();
    expectTypeOf<LoadingPageProps>().toBeObject();
    expectTypeOf<NullableBooleanInputProps>().toHaveProperty("source");
    expectTypeOf<NumberInputProps>().toHaveProperty("source");
    expectTypeOf<PasswordInputProps>().toHaveProperty("source");
    expectTypeOf<PhoneInputProps>().toHaveProperty("source");
    expectTypeOf<PlaceholderProps>().toBeObject();
    expectTypeOf<ReferenceFieldProps>().toHaveProperty("source");
    expectTypeOf<ReferenceInputProps>().toHaveProperty("source");
    expectTypeOf<ResettableTextInputProps>().toHaveProperty("source");
    expectTypeOf<ResourceProps>().toHaveProperty("name");
    expectTypeOf<SaveButtonProps>().toBeObject();
    expectTypeOf<SavedQueriesListProps>().toBeObject();
    expectTypeOf<SearchInputProps>().toBeObject();
    expectTypeOf<ShowProps>().toBeObject();
    expectTypeOf<SimpleListItemProps>().toBeObject();
    expectTypeOf<SimpleListLoadingProps>().toBeObject();
    expectTypeOf<SimpleListProps>().toBeObject();
    expectTypeOf<SingleFieldListProps>().toBeObject();
    expectTypeOf<TextFieldProps>().toHaveProperty("source");
    expectTypeOf<TextInputProps>().toHaveProperty("source");
    expectTypeOf<TimeInputProps>().toHaveProperty("source");
    expectTypeOf<ToolbarProps>().toBeObject();
    expectTypeOf<TopToolbarProps>().toBeObject();
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
