/**
 * `createResourceComponents("posts")`: the views, fields and inputs of one
 * resource, with every `source` typed by that resource's record.
 *
 * The fields and inputs are the package's own components, retyped by a cast and
 * not wrapped, so `posts.TextInput === TextInput`. The four views are wrapped,
 * because they pass the bound name down as `resource`.
 *
 * Add-on components (monaco, maps, mdx, supabase, csv-import) are not members:
 * the import fence keeps them out of the main entry, and they take the
 * registered union.
 *
 * Call the factory at module scope. Each name gets one set of views, so a call
 * inside a component body does not remount them, but it is still wasted work.
 */
import type {
  LooseRecord,
  RecordOf,
  RegisteredResourceName,
  RegisteredResources,
  ResourceMap,
  ResourceRecord,
  SourceProp,
  SourceValue,
} from "@chelone/core";
import type { ReactNode } from "react";
import type { ChoiceRecord } from "../choices-hooks";
import { ApiKeyField } from "../components/admin/fields/api-key-field";
import { ArrayField } from "../components/admin/fields/array-field";
import { BadgeField } from "../components/admin/fields/badge-field";
import { BooleanField } from "../components/admin/fields/boolean-field";
import { ChipField } from "../components/admin/fields/chip-field";
import { ColorField } from "../components/admin/fields/color-field";
import { CronField } from "../components/admin/fields/cron-field";
import { CurrencyField } from "../components/admin/fields/currency-field";
import { DateField } from "../components/admin/fields/date-field";
import { DurationField } from "../components/admin/fields/duration-field";
import { EmailField } from "../components/admin/fields/email-field";
import { FileField } from "../components/admin/fields/file-field";
import { FunctionField } from "../components/admin/fields/function-field";
import { ImageField } from "../components/admin/fields/image-field";
import { JsonField } from "../components/admin/fields/json-field";
import { NumberField } from "../components/admin/fields/number-field";
import { PhoneField } from "../components/admin/fields/phone-field";
import { RatingField } from "../components/admin/fields/rating-field";
import { RecordField } from "../components/admin/fields/record-field";
import {
  ReferenceArrayField,
  type ReferenceArrayFieldProps,
} from "../components/admin/fields/reference-array-field";
import {
  ReferenceField,
  type ReferenceFieldProps,
} from "../components/admin/fields/reference-field";
import { ReferenceManyCount } from "../components/admin/fields/reference-many-count";
import {
  ReferenceManyField,
  type ReferenceManyFieldProps,
} from "../components/admin/fields/reference-many-field";
import {
  ReferenceOneField,
  type ReferenceOneFieldProps,
} from "../components/admin/fields/reference-one-field";
import { SelectField } from "../components/admin/fields/select-field";
import { SubscriptionPlanField } from "../components/admin/fields/subscription-plan-field";
import { TextArrayField } from "../components/admin/fields/text-array-field";
import { TextField } from "../components/admin/fields/text-field";
import { UrlField } from "../components/admin/fields/url-field";
import { UsageMeterField } from "../components/admin/fields/usage-meter-field";
import { WebhookEndpointField } from "../components/admin/fields/webhook-endpoint-field";
import { WrapperField } from "../components/admin/fields/wrapper-field";
import { ApiKeyInput } from "../components/admin/inputs/api-key-input";
import {
  ArrayInput,
  type ArrayInputProps,
} from "../components/admin/inputs/array-input";
import {
  AutocompleteArrayInput,
  type AutocompleteArrayInputProps,
} from "../components/admin/inputs/autocomplete-array-input";
import {
  AutocompleteInput,
  type AutocompleteInputProps,
} from "../components/admin/inputs/autocomplete-input";
import { BooleanInput } from "../components/admin/inputs/boolean-input";
import {
  CheckboxGroupInput,
  type CheckboxGroupInputProps,
} from "../components/admin/inputs/checkbox-group-input";
import { ColorInput } from "../components/admin/inputs/color-input";
import { CronInput } from "../components/admin/inputs/cron-input";
import {
  CurrencyInput,
  type CurrencyInputProps,
} from "../components/admin/inputs/currency-input";
import { DatagridInput } from "../components/admin/inputs/datagrid-input";
import { DateInput } from "../components/admin/inputs/date-input";
import { DateTimeInput } from "../components/admin/inputs/date-time-input";
import {
  DurationInput,
  type DurationInputProps,
} from "../components/admin/inputs/duration-input";
import { FileInput } from "../components/admin/inputs/file-input";
import { ImageInput } from "../components/admin/inputs/image-input";
import { LoadingInput } from "../components/admin/inputs/loading-input";
import { NullableBooleanInput } from "../components/admin/inputs/nullable-boolean-input";
import { NumberInput } from "../components/admin/inputs/number-input";
import { PasswordInput } from "../components/admin/inputs/password-input";
import { PhoneInput } from "../components/admin/inputs/phone-input";
import { RadioButtonGroupInput } from "../components/admin/inputs/radio-button-group-input";
import {
  RatingInput,
  type RatingInputProps,
} from "../components/admin/inputs/rating-input";
import {
  ReferenceArrayInput,
  type ReferenceArrayInputProps,
} from "../components/admin/inputs/reference-array-input";
import {
  ReferenceInput,
  type ReferenceInputProps,
} from "../components/admin/inputs/reference-input";
import { ResettableTextInput } from "../components/admin/inputs/resettable-text-input";
import { SearchInput } from "../components/admin/inputs/search-input";
import {
  SelectArrayInput,
  type SelectArrayInputProps,
} from "../components/admin/inputs/select-array-input";
import { SelectInput } from "../components/admin/inputs/select-input";
import {
  SubscriptionPlanPicker,
  type SubscriptionPlanPickerProps,
} from "../components/admin/inputs/subscription-plan-picker";
import { TextArrayInput } from "../components/admin/inputs/text-array-input";
import { TextInput } from "../components/admin/inputs/text-input";
import { TimeInput } from "../components/admin/inputs/time-input";
import {
  WebhookEndpointInput,
  type WebhookEndpointInputProps,
} from "../components/admin/inputs/webhook-endpoint-input";
import { Create, type CreateProps } from "../components/admin/views/create";
import { Edit, type EditProps } from "../components/admin/views/edit";
import { List, type ListProps } from "../components/admin/views/list";
import { Show, type ShowProps } from "../components/admin/views/show";

/**
 * The package's own fields and inputs, which the factory returns unwrapped.
 */
const components = {
  ApiKeyField,
  ArrayField,
  BadgeField,
  BooleanField,
  ChipField,
  ColorField,
  CronField,
  CurrencyField,
  DateField,
  DurationField,
  EmailField,
  FileField,
  FunctionField,
  ImageField,
  JsonField,
  NumberField,
  PhoneField,
  RatingField,
  RecordField,
  ReferenceArrayField,
  ReferenceField,
  ReferenceManyCount,
  ReferenceManyField,
  ReferenceOneField,
  SelectField,
  SubscriptionPlanField,
  TextArrayField,
  TextField,
  UrlField,
  UsageMeterField,
  WebhookEndpointField,
  WrapperField,
  ApiKeyInput,
  ArrayInput,
  AutocompleteArrayInput,
  AutocompleteInput,
  BooleanInput,
  CheckboxGroupInput,
  ColorInput,
  CronInput,
  CurrencyInput,
  DatagridInput,
  DateInput,
  DateTimeInput,
  DurationInput,
  FileInput,
  ImageInput,
  LoadingInput,
  NullableBooleanInput,
  NumberInput,
  PasswordInput,
  PhoneInput,
  RadioButtonGroupInput,
  RatingInput,
  ReferenceArrayInput,
  ReferenceInput,
  ResettableTextInput,
  SearchInput,
  SelectArrayInput,
  SelectInput,
  SubscriptionPlanPicker,
  TextArrayInput,
  TextInput,
  TimeInput,
  WebhookEndpointInput,
};

type Components = typeof components;

/**
 * The `source` entry of a component's props, `TSource`-typed and still optional
 * where it was optional. Empty for props with no `source`.
 */
type SourceEntry<TProps, TSource> = "source" extends keyof TProps
  ? Partial<Pick<TProps, "source">> extends Pick<TProps, "source">
    ? { source?: TSource }
    : { source: TSource }
  : unknown;

/**
 * `TProps` with `source` replaced by `TSource`, and still optional where it was
 * optional. Props with no `source` come back as they were. Distributes over a
 * union of props.
 */
type WithSource<TProps, TSource> = TProps extends unknown
  ? "source" extends keyof TProps
    ? Omit<TProps, "source"> & SourceEntry<TProps, TSource>
    : TProps
  : never;

/** The return type of an optional callback prop. */
type CallbackResult<TCallback> =
  NonNullable<TCallback> extends (...args: never[]) => infer TResult
    ? TResult
    : never;

/** The first parameter of an optional callback prop. */
type CallbackParam<TCallback> =
  NonNullable<TCallback> extends (
    value: infer TValue,
    ...args: never[]
  ) => unknown
    ? TValue
    : never;

/**
 * The `format`, `parse`, `transform` and `defaultValue` entries of `TProps`
 * with `TValue` in place of the value they took or returned. Each stays
 * optional and keeps the rest of its signature, and one `TProps` lacks is not
 * added.
 */
type ValueEntries<TProps, TValue> = {
  [K in Extract<keyof TProps, "defaultValue">]?: TValue;
} & {
  [K in Extract<keyof TProps, "format" | "transform">]?: (
    value: TValue,
  ) => CallbackResult<TProps[K]>;
} & {
  [K in Extract<keyof TProps, "parse">]?: (
    value: CallbackParam<TProps[K]>,
  ) => TValue;
};

/** Whether `TProps` has a `format`, `parse`, `transform` or `defaultValue`. */
type HasValueProps<TProps> = [
  keyof TProps & ("format" | "parse" | "transform" | "defaultValue"),
] extends [never]
  ? false
  : true;

/**
 * A component whose `source` prop is `TSource`. A generic component is read at
 * its constraint, which is the loose record it defaults to.
 */
type WithSourceComponent<TComponent, TSource> = TComponent extends (
  props: infer TProps,
) => infer TResult
  ? (props: WithSource<TProps, TSource>) => TResult
  : TComponent;

/**
 * A component with a `format`, `parse` or `transform` is generic over the
 * literal `source`, so those callbacks take the value at it. One without
 * keeps {@link WithSourceComponent}'s signature. `NoInfer` keeps `TPath` from
 * being inferred back through `SourceValue` out of a callback's parameter,
 * which overflows the type depth.
 */
type ResourceMember<TComponent, TRecord> = TComponent extends (
  props: infer TProps,
) => infer TResult
  ? HasValueProps<TProps> extends true
    ? <TPath extends SourceProp<TRecord>>(
        props: Omit<
          TProps,
          "source" | "format" | "parse" | "transform" | "defaultValue"
        > &
          SourceEntry<TProps, TPath> &
          ValueEntries<TProps, NoInfer<SourceValue<TRecord, TPath>>>,
      ) => TResult
    : WithSourceComponent<TComponent, SourceProp<TRecord>>
  : TComponent;

/**
 * `ArrayInput` is generic over its record and its `source`, so its rows are
 * typed by the array at that `source`, which {@link ResourceMember} would read
 * at the constraint.
 */
type ArrayInputMember<TRecord> = <TPath extends SourceProp<TRecord>>(
  props: ArrayInputProps<TRecord, TPath>,
) => ReactNode;

/**
 * `TProps` of one `source`, with its `format` and `parse` taking the value at
 * that `source` like {@link ResourceMember}'s. `NoInfer` keeps `TPath` from
 * being inferred back through `SourceValue` out of `defaultValue`, which
 * overflows the type depth.
 */
type TypedInputProps<TProps, TRecord, TPath extends SourceProp<TRecord>> = Omit<
  TProps,
  "defaultValue" | "format" | "parse"
> & { defaultValue?: NoInfer<SourceValue<TRecord, TPath>> } & ValueEntries<
    TProps,
    NoInfer<SourceValue<TRecord, TPath>>
  >;

/**
 * The inputs generic over their record and `source`, so `defaultValue` is the
 * value at that `source`, which {@link ResourceMember} would read at the
 * constraint.
 */
type TypedInputMembers<TRecord> = {
  AutocompleteArrayInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: TypedInputProps<
      AutocompleteArrayInputProps<TRecord, TPath, TChoice>,
      TRecord,
      TPath
    >,
  ) => ReactNode;
  AutocompleteInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: TypedInputProps<
      AutocompleteInputProps<TRecord, TPath, TChoice>,
      TRecord,
      TPath
    >,
  ) => ReactNode;
  CheckboxGroupInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: TypedInputProps<
      CheckboxGroupInputProps<TRecord, TPath, TChoice>,
      TRecord,
      TPath
    >,
  ) => ReactNode;
  CurrencyInput: <TPath extends SourceProp<TRecord>>(
    props: TypedInputProps<CurrencyInputProps<TRecord, TPath>, TRecord, TPath>,
  ) => ReactNode;
  DurationInput: <TPath extends SourceProp<TRecord>>(
    props: TypedInputProps<DurationInputProps<TRecord, TPath>, TRecord, TPath>,
  ) => ReactNode;
  RatingInput: <TPath extends SourceProp<TRecord>>(
    props: TypedInputProps<RatingInputProps<TRecord, TPath>, TRecord, TPath>,
  ) => ReactNode;
  SelectArrayInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: TypedInputProps<
      SelectArrayInputProps<TRecord, TPath, TChoice>,
      TRecord,
      TPath
    >,
  ) => ReactNode;
  SubscriptionPlanPicker: <TPath extends SourceProp<TRecord>>(
    props: TypedInputProps<
      SubscriptionPlanPickerProps<TRecord, TPath>,
      TRecord,
      TPath
    >,
  ) => ReactNode;
  WebhookEndpointInput: <TPath extends SourceProp<TRecord>>(
    props: TypedInputProps<
      WebhookEndpointInputProps<TRecord, TPath>,
      TRecord,
      TPath
    >,
  ) => ReactNode;
};

/**
 * The reference components are generic over the referenced name too, so
 * `reference` is a name of `TResources` and `target` a key of that resource's
 * record, which {@link ResourceMember} would read at the constraint.
 */
type ReferenceMembers<
  TRecord extends ResourceRecord,
  TResources extends ResourceMap,
> = {
  ReferenceArrayField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceArrayFieldProps<TRecord, TResources, TReference>,
  ) => ReactNode;
  ReferenceArrayInput: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceArrayInputProps<TRecord, TResources, TReference>,
  ) => ReactNode;
  ReferenceField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceFieldProps<TRecord, TResources, TReference>,
  ) => ReactNode;
  ReferenceInput: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceInputProps<TRecord, TResources, TReference>,
  ) => ReactNode;
  ReferenceManyField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceManyFieldProps<TRecord, TResources, TReference>,
  ) => ReactNode;
  ReferenceOneField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceOneFieldProps<TRecord, TResources, TReference>,
  ) => ReactNode;
};

/** A view with no `resource` prop: the factory has bound it. */
type BoundView<TProps extends { resource?: string }, TResult> = (
  props: Omit<TProps, "resource">,
) => TResult;

/**
 * The views, fields and inputs of one resource of `TResources`, each `source`
 * typed by {@link SourceProp} of that resource's record.
 */
export type ResourceComponents<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
> = {
  [K in Exclude<
    keyof Components,
    | "ArrayInput"
    | keyof TypedInputMembers<LooseRecord>
    | keyof ReferenceMembers<LooseRecord, ResourceMap>
  >]: ResourceMember<Components[K], RecordOf<TResources, TName>>;
} & TypedInputMembers<RecordOf<TResources, TName>> &
  ReferenceMembers<RecordOf<TResources, TName>, TResources> & {
    ArrayInput: ArrayInputMember<RecordOf<TResources, TName>>;
    Edit: BoundView<EditProps<RecordOf<TResources, TName>>, ReactNode>;
    Create: BoundView<CreateProps<RecordOf<TResources, TName>>, ReactNode>;
    Show: BoundView<ShowProps, ReturnType<typeof Show>>;
    List: BoundView<ListProps, ReturnType<typeof List>>;
  };

/** What `build` returns: the package's components plus the four views bound to one resource. */
type BuiltComponents = typeof components & {
  Edit: (props: Omit<EditProps, "resource">) => ReturnType<typeof Edit>;
  Create: (props: Omit<CreateProps, "resource">) => ReturnType<typeof Create>;
  Show: (props: Omit<ShowProps, "resource">) => ReturnType<typeof Show>;
  List: (props: Omit<ListProps, "resource">) => ReturnType<typeof List>;
};

const cache = new Map<string, BuiltComponents>();

function build(name: string): BuiltComponents {
  const cached = cache.get(name);
  if (cached) return cached;
  const built: BuiltComponents = {
    ...components,
    // biome-ignore lint/correctness/noComponentHookFactories: built once per resource name, then cached
    Edit: (props: Omit<EditProps, "resource">) => (
      <Edit {...props} resource={name} />
    ),
    // biome-ignore lint/correctness/noComponentHookFactories: built once per resource name, then cached
    Create: (props: Omit<CreateProps, "resource">) => (
      <Create {...props} resource={name} />
    ),
    // biome-ignore lint/correctness/noComponentHookFactories: built once per resource name, then cached
    Show: (props: Omit<ShowProps, "resource">) => (
      <Show {...props} resource={name} />
    ),
    // biome-ignore lint/correctness/noComponentHookFactories: built once per resource name, then cached
    List: (props: Omit<ListProps, "resource">) => (
      <List {...props} resource={name} />
    ),
  };
  cache.set(name, built);
  return built;
}

/**
 * The components of the resource `name`, typed by the record of that resource
 * in the map `TResources`. Use it where `Register` is not augmented, as a type
 * test does.
 *
 * @example
 * const posts = createResourceComponentsOf<typeof resources, "posts">("posts");
 */
export function createResourceComponentsOf<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(name: TName): ResourceComponents<TResources, TName> {
  return build(name) as ResourceComponents<TResources, TName>;
}

/**
 * The components of the resource `name`, typed by the record of that resource
 * in the registered map. With nothing registered every name compiles and every
 * `source` is a `string`.
 *
 * @example
 * const posts = createResourceComponents("posts");
 * <posts.TextInput source="title" />
 */
export function createResourceComponents<TName extends RegisteredResourceName>(
  name: TName,
): ResourceComponents<RegisteredResources, TName> {
  return build(name) as ResourceComponents<RegisteredResources, TName>;
}
