/**
 * The public surface of `@chelone/vue`: every component the barrel exports
 * ships its props type next to it, as `@chelone/react` does.
 */

import type {
  ComputeDefinitionProps,
  PresenceUser,
  ResourceDefinition,
  ResourceMap,
  ResourceRecord,
  UserIdentity,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { Component, ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import type {
  AdminProps,
  ApplicationUpdatedNotificationProps,
  BooleanInputProps,
  BulkActionsToolbarProps,
  BulkEditDrawerProps,
  CalendarListProps,
  CheckForApplicationUpdateProps,
  CloneButtonProps,
  ColorInputProps,
  ColumnsButtonProps,
  CommandMenuAction,
  CommandMenuContextValue,
  CommandMenuProps,
  CommentRecord,
  CommentsThreadProps,
  CountProps,
  CreateProps,
  CurrencyInputProps,
  CustomRoute,
  DataTableColProps,
  DataTableNumberColProps,
  DataTableProps,
  DateInputProps,
  DateTimeInputProps,
  DiffViewerMode,
  DiffViewerProps,
  DualApprovalButtonProps,
  DurationInputProps,
  EditLiveProps,
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
  ListLiveProps,
  ListNoResultsProps,
  ListPaginationProps,
  ListProps,
  ListToolbarProps,
  LoadingIndicatorProps,
  LoadingPageProps,
  LocalesMenuButtonProps,
  LockOnMountProps,
  LockStatusProps,
  LoginWithEmailProps,
  MenuLiveItemLinkProps,
  MenuLiveProps,
  MetricCardProps,
  NotFoundProps,
  NullableBooleanInputProps,
  NumberInputProps,
  OfflineProps,
  PasswordInputProps,
  PhoneInputProps,
  PivotGridProps,
  PlaceholderProps,
  PresenceBarProps,
  PrevNextButtonsProps,
  RecordRepresentation,
  RecordTimelineProps,
  ReferenceFieldProps,
  ReferenceInputProps,
  RefreshIconButtonProps,
  ResettableTextInputProps,
  ResourceComponents,
  ResourceProps,
  SaveButtonProps,
  SavedQueriesListProps,
  SearchInputProps,
  SelectAllButtonProps,
  ShowLiveProps,
  ShowProps,
  SimpleListItemProps,
  SimpleListLoadingProps,
  SimpleListProps,
  SingleFieldListProps,
  SkipNavigationButtonProps,
  StatusTransitionButtonProps,
  Subscribable,
  TextFieldProps,
  TextInputProps,
  TimeInputProps,
  ToggleFilterButtonProps,
  ToolbarProps,
  TopToolbarProps,
  TreeListProps,
  UpdateButtonProps,
  UsePresenceOptions,
  UsePrevNextControllerOptions,
  ValidationErrorProps,
} from "./index";
import * as barrel from "./index";

describe("@chelone/vue public exports", () => {
  it("exports each component's props type", () => {
    expectTypeOf<AdminProps>().toHaveProperty("dataProvider");
    expectTypeOf<AdminProps>().toHaveProperty("customRoutes");
    expectTypeOf<CustomRoute>().toHaveProperty("path");
    expectTypeOf<ApplicationUpdatedNotificationProps>().toBeObject();
    expectTypeOf<BooleanInputProps>().toHaveProperty("source");
    expectTypeOf<BulkActionsToolbarProps>().toBeObject();
    expectTypeOf<BulkEditDrawerProps>().toHaveProperty("label");
    expectTypeOf<CheckForApplicationUpdateProps>().toHaveProperty("url");
    expectTypeOf<CloneButtonProps>().toHaveProperty("record");
    expectTypeOf<CloneButtonProps>().toHaveProperty("class");
    expectTypeOf<ColorInputProps>().toHaveProperty("source");
    expectTypeOf<ColumnsButtonProps>().toHaveProperty("resource");
    expectTypeOf<ColumnsButtonProps>().toHaveProperty("storeKey");
    expectTypeOf<ColumnsButtonProps>().toHaveProperty("class");
    expectTypeOf<CreateProps>().toBeObject();
    expectTypeOf<CurrencyInputProps>().toHaveProperty("source");
    expectTypeOf<DataTableColProps>().toBeObject();
    expectTypeOf<DataTableNumberColProps>().toHaveProperty("source");
    expectTypeOf<DataTableProps>().toBeObject();
    expectTypeOf<DateInputProps>().toHaveProperty("source");
    expectTypeOf<DateTimeInputProps>().toHaveProperty("source");
    expectTypeOf<DiffViewerProps>().toHaveProperty("before");
    expectTypeOf<DiffViewerProps>().toHaveProperty("sources");
    expectTypeOf<DiffViewerMode>().toEqualTypeOf<"side-by-side" | "inline">();
    expectTypeOf<DualApprovalButtonProps>().toHaveProperty("required");
    expectTypeOf<DualApprovalButtonProps>().toHaveProperty("approverSource");
    expectTypeOf<DualApprovalButtonProps>().toHaveProperty("mutationMode");
    expectTypeOf<DualApprovalButtonProps>().toHaveProperty("class");
    expectTypeOf<DurationInputProps>().toHaveProperty("source");
    expectTypeOf<ErrorFallbackProps>().toHaveProperty("error");
    expectTypeOf<CountProps>().toBeObject();
    expectTypeOf<EditProps>().toBeObject();
    expectTypeOf<EditLiveProps>().toEqualTypeOf<EditProps>();
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
    expectTypeOf<ListLiveProps>().toEqualTypeOf<ListProps>();
    expectTypeOf<ListNoResultsProps>().toBeObject();
    expectTypeOf<ListPaginationProps>().toBeObject();
    expectTypeOf<ListToolbarProps>().toBeObject();
    expectTypeOf<LoadingIndicatorProps>().toBeObject();
    expectTypeOf<LocalesMenuButtonProps>().toHaveProperty("languages");
    expectTypeOf<LocalesMenuButtonProps>().toHaveProperty("class");
    expectTypeOf(barrel.useLocales).toBeFunction();
    expectTypeOf<LoadingPageProps>().toBeObject();
    expectTypeOf<LockOnMountProps>().toHaveProperty("onLockError");
    expectTypeOf<LockStatusProps>().toHaveProperty("resource");
    expectTypeOf<LoginWithEmailProps>().toHaveProperty("onSubmit");
    expectTypeOf<LoginWithEmailProps>().toHaveProperty("loading");
    expectTypeOf<LoginWithEmailProps>().toHaveProperty("redirectTo");
    expectTypeOf<LoginWithEmailProps>().toHaveProperty("submitLabel");
    expectTypeOf<LoginWithEmailProps>().toHaveProperty("class");
    expectTypeOf<MenuLiveItemLinkProps>().toHaveProperty("resource");
    expectTypeOf<MenuLiveProps>().toHaveProperty("items");
    expectTypeOf<MetricCardProps>().toHaveProperty("label");
    expectTypeOf<MetricCardProps["icon"]>().toEqualTypeOf<
      Component | undefined
    >();
    expectTypeOf<MetricCardProps["class"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(barrel.MetricCard).toBeObject();
    expectTypeOf<NotFoundProps>().toHaveProperty("title");
    expectTypeOf<NotFoundProps>().toHaveProperty("class");
    expectTypeOf<NullableBooleanInputProps>().toHaveProperty("source");
    expectTypeOf<NumberInputProps>().toHaveProperty("source");
    expectTypeOf<OfflineProps>().toBeObject();
    expectTypeOf<PasswordInputProps>().toHaveProperty("source");
    expectTypeOf<PhoneInputProps>().toHaveProperty("source");
    expectTypeOf<PlaceholderProps>().toBeObject();
    expectTypeOf<PivotGridProps>().toHaveProperty("rowSource");
    expectTypeOf<PivotGridProps>().toHaveProperty("columnSource");
    expectTypeOf<PrevNextButtonsProps>().toHaveProperty("linkType");
    expectTypeOf<PrevNextButtonsProps>().toHaveProperty("class");
    expectTypeOf<UsePrevNextControllerOptions>().toHaveProperty("record");
    expectTypeOf(barrel.usePrevNextController).toBeFunction();
    expectTypeOf<RefreshIconButtonProps>().toBeObject();
    expectTypeOf<ReferenceFieldProps>().toHaveProperty("source");
    expectTypeOf<ReferenceInputProps>().toHaveProperty("source");
    expectTypeOf<ResettableTextInputProps>().toHaveProperty("source");
    expectTypeOf<ResourceProps>().toHaveProperty("name");
    expectTypeOf<SaveButtonProps>().toBeObject();
    expectTypeOf<SavedQueriesListProps>().toBeObject();
    expectTypeOf<SearchInputProps>().toBeObject();
    expectTypeOf<SelectAllButtonProps>().toHaveProperty("limit");
    expectTypeOf<ShowProps>().toBeObject();
    expectTypeOf<ShowLiveProps>().toEqualTypeOf<ShowProps>();
    expectTypeOf<SkipNavigationButtonProps>().toHaveProperty("label");
    expectTypeOf<SkipNavigationButtonProps>().toHaveProperty("class");
    expectTypeOf<SimpleListItemProps>().toBeObject();
    expectTypeOf<SimpleListLoadingProps>().toBeObject();
    expectTypeOf<SimpleListProps>().toBeObject();
    expectTypeOf<SingleFieldListProps>().toBeObject();
    expectTypeOf<StatusTransitionButtonProps>().toHaveProperty("transitions");
    expectTypeOf<StatusTransitionButtonProps>().toHaveProperty("guards");
    expectTypeOf<StatusTransitionButtonProps>().toHaveProperty("labels");
    expectTypeOf<StatusTransitionButtonProps>().toHaveProperty("confirm");
    expectTypeOf<TextFieldProps>().toHaveProperty("source");
    expectTypeOf<TextInputProps>().toHaveProperty("source");
    expectTypeOf<TimeInputProps>().toHaveProperty("source");
    expectTypeOf<ToggleFilterButtonProps>().toHaveProperty("value");
    expectTypeOf<ToolbarProps>().toBeObject();
    expectTypeOf<TopToolbarProps>().toBeObject();
    expectTypeOf<TreeListProps>().toHaveProperty("parentSource");
    expectTypeOf<UpdateButtonProps>().toHaveProperty("data");
    expectTypeOf<UpdateButtonProps>().toHaveProperty("mutationMode");
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

  it("DualApprovalButton and StatusTransitionButton ship beside their props", () => {
    expectTypeOf(barrel.DualApprovalButton).not.toBeAny();
    expectTypeOf(barrel.StatusTransitionButton).not.toBeAny();
  });

  it("ColumnsButton ships beside its props", () => {
    expectTypeOf(barrel.ColumnsButton).not.toBeAny();
  });

  it("useDataTableColumns returns refs and setters", () => {
    type Result = ReturnType<typeof barrel.useDataTableColumns>;
    expectTypeOf<Result>().toHaveProperty("toggle");
    expectTypeOf<Result>().toHaveProperty("columns");
  });

  it("PivotGrid ships beside its props", () => {
    expectTypeOf(barrel.PivotGrid).not.toBeAny();
  });

  it("RecordTimeline ships beside its props", () => {
    expectTypeOf(barrel.RecordTimeline).not.toBeAny();
    expectTypeOf<RecordTimelineProps>().toHaveProperty("messageSource");
    expectTypeOf<RecordTimelineProps>().toHaveProperty("timestampSource");
  });

  it("TreeList ships beside its props", () => {
    expectTypeOf(barrel.TreeList).not.toBeAny();
  });

  it("CalendarList ships beside its props", () => {
    expectTypeOf(barrel.CalendarList).not.toBeAny();
    expectTypeOf<CalendarListProps>().toHaveProperty("startSource");
    expectTypeOf<CalendarListProps["weekStartsOn"]>().toEqualTypeOf<
      0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    >();
  });

  it("CommentsThread ships beside its props and the Textarea it uses", () => {
    expectTypeOf<CommentsThreadProps>().toHaveProperty("reference");
    expectTypeOf<CommentsThreadProps>().toHaveProperty("target");
    expectTypeOf<CommentsThreadProps["resolvable"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<CommentRecord>().toHaveProperty("body");
    expectTypeOf(barrel.CommentsThread).not.toBeAny();
    expectTypeOf(barrel.Textarea).not.toBeAny();
  });

  it("PresenceBar and usePresence ship beside their types", () => {
    expectTypeOf<PresenceBarProps>().toHaveProperty("maxAvatars");
    expectTypeOf<PresenceBarProps>().toHaveProperty("currentUser");
    expectTypeOf<PresenceBarProps["currentUser"]>().toEqualTypeOf<
      PresenceUser | undefined
    >();
    expectTypeOf(barrel.PresenceBar).not.toBeAny();
    expectTypeOf<UsePresenceOptions>().toHaveProperty("topic");
    expectTypeOf(barrel.usePresence).returns.toEqualTypeOf<{
      users: ComputedRef<PresenceUser[]>;
    }>();
    expectTypeOf(barrel.AvatarGroup).not.toBeAny();
    expectTypeOf(barrel.AvatarGroupCount).not.toBeAny();
  });

  it("CommandMenu ships beside its props and its hooks", () => {
    expectTypeOf<CommandMenuProps>().toHaveProperty("hotkey");
    expectTypeOf<CommandMenuProps["hotkey"]>().toEqualTypeOf<
      string | false | undefined
    >();
    expectTypeOf<CommandMenuProps>().toHaveProperty("actions");
    expectTypeOf<CommandMenuProps["actions"]>().toEqualTypeOf<
      CommandMenuAction[] | undefined
    >();
    expectTypeOf(barrel.CommandMenu).not.toBeAny();
    expectTypeOf(
      barrel.useCommandMenu,
    ).returns.toEqualTypeOf<CommandMenuContextValue>();
    expectTypeOf<CommandMenuContextValue["isOpen"]>().toEqualTypeOf<
      Readonly<Ref<boolean>>
    >();
    expectTypeOf(barrel.useRegisterCommand)
      .parameter(0)
      .toEqualTypeOf<MaybeRefOrGetter<CommandMenuAction>>();
  });

  it("keeps internal helpers out of the barrel", () => {
    expectTypeOf(barrel).not.toHaveProperty("areIdsEqual");
    expectTypeOf(barrel).not.toHaveProperty("WebhookEndpointFieldEndpoint");
  });

  it("useOptionalIdentity returns identity and isPending as computed refs", () => {
    type Result = ReturnType<typeof barrel.useOptionalIdentity>;
    expectTypeOf<Result["identity"]>().toEqualTypeOf<
      ComputedRef<UserIdentity | undefined>
    >();
    expectTypeOf<Result["isPending"]>().toEqualTypeOf<ComputedRef<boolean>>();
  });

  it("exports the resource component factories and their type", () => {
    expectTypeOf(barrel.createResourceComponents).toBeFunction();
    expectTypeOf(barrel.createResourceComponentsOf).toBeFunction();
    expectTypeOf<ResourceComponents<ResourceMap, string>>().toHaveProperty(
      "TextInput",
    );
  });

  it("createResourceComponents takes any name when nothing is registered", () => {
    expectTypeOf(barrel.createResourceComponents<string>).toBeFunction();
    barrel.createResourceComponents("anything");
  });
});

describe("resource definition slot types", () => {
  it("types a definition's icon as a Vue component", () => {
    expectTypeOf<ResourceDefinition["icon"]>().toEqualTypeOf<
      Component | undefined
    >();
  });

  it("types a definition's recordRepresentation as RecordRepresentation", () => {
    expectTypeOf<ResourceDefinition["recordRepresentation"]>().toEqualTypeOf<
      RecordRepresentation | undefined
    >();
    expectTypeOf<RecordRepresentation>().toEqualTypeOf<
      string | ((record: ResourceRecord) => string | number) | Component
    >();
  });

  it("types the route components as a Vue component", () => {
    expectTypeOf<ComputeDefinitionProps["list"]>().toEqualTypeOf<
      Component | undefined
    >();
  });
});
