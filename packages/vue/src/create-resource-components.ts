/**
 * `createResourceComponents("posts")` — the views, fields and inputs of one
 * resource, with every `source` prop typed by that resource's record alone.
 * The Vue twin of `@chelone/react`'s `createResourceComponents`.
 *
 * ```vue
 * <script setup lang="ts">
 * const posts = createResourceComponents("posts");
 * </script>
 * <template>
 *   <posts.Edit :id="1"><posts.TextInput source="title" /></posts.Edit>
 * </template>
 * ```
 *
 * Fields and inputs are the package's own SFCs, retyped by a cast (so
 * `posts.TextInput === TextInput`). The four views are wrapped so they bind
 * the resource and take no `resource` prop. The add-ons (maps, monaco, mdx,
 * supabase, csv-import) are not members: the import fence keeps them out of
 * this entry, and they take the registered union.
 *
 * Generic fields and inputs (`generic=` SFCs: `RecordField`, `SelectInput`,
 * `ApiKeyField`, ...) are not members of the type unless `TypedFieldMembers` or
 * `TypedInputMembers` lists them (`TextField`, `DateField`, ...). Their type is a function
 * with no constructor signature, so `Retyped` cannot replace their `source`
 * without erasing the generic. The test is the type itself, so an SFC that
 * becomes generic later drops out of `ResourceComponents` on its own, and a
 * template that uses it fails `vue-tsc` instead of the build. Import them
 * directly; their `source` keeps the registered union, or a plain string when
 * nothing is registered.
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
import {
  type AllowedComponentProps,
  type Component,
  defineComponent,
  h,
  type VNode,
  type VNodeProps,
} from "vue";
import type { ChoiceRecord } from "./choices/use-choices";
import ApiKeyField from "./components/admin/fields/api-key-field.vue";
import ArrayField from "./components/admin/fields/array-field.vue";
import BadgeField, {
  type BadgeFieldProps,
} from "./components/admin/fields/badge-field.vue";
import BooleanField, {
  type BooleanFieldProps,
} from "./components/admin/fields/boolean-field.vue";
import ChipField, {
  type ChipFieldProps,
} from "./components/admin/fields/chip-field.vue";
import ColorField, {
  type ColorFieldProps,
} from "./components/admin/fields/color-field.vue";
import CronField, {
  type CronFieldProps,
} from "./components/admin/fields/cron-field.vue";
import CurrencyField, {
  type CurrencyFieldProps,
} from "./components/admin/fields/currency-field.vue";
import DateField, {
  type DateFieldProps,
} from "./components/admin/fields/date-field.vue";
import DurationField, {
  type DurationFieldProps,
} from "./components/admin/fields/duration-field.vue";
import EmailField, {
  type EmailFieldProps,
} from "./components/admin/fields/email-field.vue";
import FileField, {
  type FileFieldProps,
} from "./components/admin/fields/file-field.vue";
import FunctionField from "./components/admin/fields/function-field.vue";
import ImageField, {
  type ImageFieldProps,
} from "./components/admin/fields/image-field.vue";
import JsonField, {
  type JsonFieldProps,
} from "./components/admin/fields/json-field.vue";
import NumberField, {
  type NumberFieldProps,
} from "./components/admin/fields/number-field.vue";
import PhoneField, {
  type PhoneFieldProps,
} from "./components/admin/fields/phone-field.vue";
import RatingField from "./components/admin/fields/rating-field.vue";
import RecordField from "./components/admin/fields/record-field.vue";
import ReferenceArrayField, {
  type ReferenceArrayFieldProps,
} from "./components/admin/fields/reference-array-field.vue";
import ReferenceField, {
  type ReferenceFieldProps,
} from "./components/admin/fields/reference-field.vue";
import ReferenceManyCount from "./components/admin/fields/reference-many-count.vue";
import ReferenceManyField, {
  type ReferenceManyFieldProps,
} from "./components/admin/fields/reference-many-field.vue";
import ReferenceOneField, {
  type ReferenceOneFieldProps,
} from "./components/admin/fields/reference-one-field.vue";
import SelectField from "./components/admin/fields/select-field.vue";
import SubscriptionPlanField, {
  type SubscriptionPlanFieldProps,
} from "./components/admin/fields/subscription-plan-field.vue";
import TextArrayField, {
  type TextArrayFieldProps,
} from "./components/admin/fields/text-array-field.vue";
import TextField, {
  type TextFieldProps,
} from "./components/admin/fields/text-field.vue";
import UrlField, {
  type UrlFieldProps,
} from "./components/admin/fields/url-field.vue";
import UsageMeterField from "./components/admin/fields/usage-meter-field.vue";
import WebhookEndpointField from "./components/admin/fields/webhook-endpoint-field.vue";
import WrapperField from "./components/admin/fields/wrapper-field.vue";
import ApiKeyInput from "./components/admin/inputs/api-key-input.vue";
import ArrayInput, {
  type ArrayInputProps,
} from "./components/admin/inputs/array-input.vue";
import ArrayInputRow from "./components/admin/inputs/array-input-row.vue";
import AutocompleteArrayInput, {
  type AutocompleteArrayInputProps,
} from "./components/admin/inputs/autocomplete-array-input.vue";
import AutocompleteInput, {
  type AutocompleteInputProps,
} from "./components/admin/inputs/autocomplete-input.vue";
import BooleanInput from "./components/admin/inputs/boolean-input.vue";
import CheckboxGroupInput, {
  type CheckboxGroupInputProps,
} from "./components/admin/inputs/checkbox-group-input.vue";
import ColorInput from "./components/admin/inputs/color-input.vue";
import CronInput from "./components/admin/inputs/cron-input.vue";
import CurrencyInput, {
  type CurrencyInputProps,
} from "./components/admin/inputs/currency-input.vue";
import DatagridInput, {
  type DatagridInputProps,
} from "./components/admin/inputs/datagrid-input.vue";
import DateInput, {
  type DateInputProps,
} from "./components/admin/inputs/date-input.vue";
import DateTimeInput, {
  type DateTimeInputProps,
} from "./components/admin/inputs/date-time-input.vue";
import DurationInput, {
  type DurationInputProps,
} from "./components/admin/inputs/duration-input.vue";
import FileInput, {
  type FileInputProps,
} from "./components/admin/inputs/file-input.vue";
import FileInputPreview from "./components/admin/inputs/file-input-preview.vue";
import ImageInput from "./components/admin/inputs/image-input.vue";
import ImageInputThumbnail from "./components/admin/inputs/image-input-thumbnail.vue";
import LoadingInput from "./components/admin/inputs/loading-input.vue";
import NullableBooleanInput from "./components/admin/inputs/nullable-boolean-input.vue";
import NumberInput, {
  type NumberInputProps,
} from "./components/admin/inputs/number-input.vue";
import PasswordInput, {
  type PasswordInputProps,
} from "./components/admin/inputs/password-input.vue";
import PhoneInput from "./components/admin/inputs/phone-input.vue";
import RadioButtonGroupInput from "./components/admin/inputs/radio-button-group-input.vue";
import RatingInput, {
  type RatingInputProps,
} from "./components/admin/inputs/rating-input.vue";
import ReferenceArrayInput, {
  type ReferenceArrayInputProps,
} from "./components/admin/inputs/reference-array-input.vue";
import ReferenceInput, {
  type ReferenceInputProps,
} from "./components/admin/inputs/reference-input.vue";
import ResettableTextInput from "./components/admin/inputs/resettable-text-input.vue";
import SearchInput from "./components/admin/inputs/search-input.vue";
import SelectArrayInput, {
  type SelectArrayInputProps,
} from "./components/admin/inputs/select-array-input.vue";
import SelectInput from "./components/admin/inputs/select-input.vue";
import SubscriptionPlanPicker, {
  type SubscriptionPlanPickerProps,
} from "./components/admin/inputs/subscription-plan-picker.vue";
import TextArrayInput from "./components/admin/inputs/text-array-input.vue";
import TextInput, {
  type TextInputProps,
} from "./components/admin/inputs/text-input.vue";
import TimeInput, {
  type TimeInputProps,
} from "./components/admin/inputs/time-input.vue";
import WebhookEndpointInput, {
  type WebhookEndpointInputProps,
} from "./components/admin/inputs/webhook-endpoint-input.vue";
import Create, { type CreateProps } from "./components/admin/view/create.vue";
import Edit, { type EditProps } from "./components/admin/view/edit.vue";
import List from "./components/admin/view/list.vue";
import Show from "./components/admin/view/show.vue";

/** The package's own fields and inputs, by export name. */
const sourceMembers = {
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
  ArrayInputRow,
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
  FileInputPreview,
  ImageInput,
  ImageInputThumbnail,
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

type SourceMembers = typeof sourceMembers;

type Ctor = abstract new (...args: never[]) => { $props: object };

/** `P` with `source` swapped for `TSource`, optional where `P`'s was. */
type WithSource<P, TSource> = "source" extends keyof P
  ? Omit<P, "source"> &
      (Partial<Pick<P, "source">> extends Pick<P, "source">
        ? { source?: TSource }
        : { source: TSource })
  : P;

/**
 * An SFC's constructor type with `$props["source"]` replaced. Volar reads a
 * template tag's props off the constructor's instance `$props`, so that is the
 * one place the replacement has to land. The static members are kept, the
 * original signatures are not.
 */
type Retyped<TComponent extends Ctor, TSource> = Pick<
  TComponent,
  keyof TComponent
> &
  (new (
    ...args: ConstructorParameters<TComponent>
  ) => Omit<InstanceType<TComponent>, "$props"> & {
    $props: WithSource<InstanceType<TComponent>["$props"], TSource>;
  });

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
 * The `format`, `parse`, `transform` and `defaultValue` entries of `P` with
 * `TValue` in place of the value they took or returned. Each stays optional
 * and keeps the rest of its signature, and one `P` lacks is not added.
 */
type ValueEntries<P, TValue> = {
  [K in Extract<keyof P, "defaultValue">]?: TValue;
} & {
  [K in Extract<keyof P, "format" | "transform">]?: (
    value: TValue,
  ) => CallbackResult<P[K]>;
} & {
  [K in Extract<keyof P, "parse">]?: (value: CallbackParam<P[K]>) => TValue;
};

/**
 * A function component over the literal `source`, so the `format`, `parse`,
 * `transform` and `defaultValue` in `TProps` take the value at it. Volar reads
 * a function component's props off its first parameter and its slots off the
 * second. `NoInfer` keeps `TPath` from being inferred back through
 * `SourceValue` out of a callback's parameter, which overflows the type depth.
 */
type ValueFunction<TProps, TSlots, TRecord> = <
  TPath extends SourceProp<TRecord>,
>(
  props: Omit<
    TProps,
    "source" | "format" | "parse" | "transform" | "defaultValue"
  > &
    (Partial<Pick<TProps, Extract<keyof TProps, "source">>> extends Pick<
      TProps,
      Extract<keyof TProps, "source">
    >
      ? { source?: TPath }
      : { source: TPath }) &
    ValueEntries<TProps, NoInfer<SourceValue<TRecord, TPath>>>,
  ctx?: { slots?: TSlots },
) => VNode;

/** A member whose SFC has a constructor: its props are read off `$props`. */
type ValueMember<TComponent extends Ctor, TRecord> = ValueFunction<
  InstanceType<TComponent>["$props"],
  InstanceType<TComponent>["$slots"],
  TRecord
>;

/**
 * A member whose SFC is generic in its record, so it is a function and not a
 * constructor, and its props cannot be read off it: Vue's generic props type
 * has an index signature, which `Omit` would collapse. `TProps` is the SFC's
 * exported props interface at the default (loose) record, retyped by
 * {@link ValueFunction} as for a {@link ValueMember}.
 */
type GenericValueMember<TProps, TRecord, TSlots = object> = ValueFunction<
  TProps & VNodeProps & AllowedComponentProps,
  TSlots,
  TRecord
>;

/** The display fields that are generic in their record, retyped to `TRecord`. */
type TypedFieldMembers<TRecord> = {
  BadgeField: GenericValueMember<BadgeFieldProps, TRecord>;
  BooleanField: GenericValueMember<BooleanFieldProps, TRecord>;
  ChipField: GenericValueMember<ChipFieldProps, TRecord>;
  ColorField: GenericValueMember<ColorFieldProps, TRecord>;
  CronField: GenericValueMember<CronFieldProps, TRecord>;
  CurrencyField: GenericValueMember<CurrencyFieldProps, TRecord>;
  DateField: GenericValueMember<DateFieldProps, TRecord>;
  DurationField: GenericValueMember<DurationFieldProps, TRecord>;
  EmailField: GenericValueMember<EmailFieldProps, TRecord>;
  FileField: GenericValueMember<FileFieldProps, TRecord>;
  ImageField: GenericValueMember<ImageFieldProps, TRecord>;
  JsonField: GenericValueMember<JsonFieldProps, TRecord>;
  NumberField: GenericValueMember<NumberFieldProps, TRecord>;
  PhoneField: GenericValueMember<PhoneFieldProps, TRecord>;
  SubscriptionPlanField: GenericValueMember<
    SubscriptionPlanFieldProps,
    TRecord
  >;
  TextArrayField: GenericValueMember<TextArrayFieldProps, TRecord>;
  TextField: GenericValueMember<TextFieldProps, TRecord>;
  UrlField: GenericValueMember<UrlFieldProps, TRecord>;
};

/** The member type: {@link ValueMember} when the props have a value callback or a `defaultValue`, else {@link Retyped}. */
type ResourceMember<TComponent extends Ctor, TRecord> = [
  keyof InstanceType<TComponent>["$props"] &
    ("format" | "parse" | "transform" | "defaultValue"),
] extends [never]
  ? Retyped<TComponent, SourceProp<TRecord>>
  : ValueMember<TComponent, TRecord>;

/** The slots `<ArrayInput>` declares: they do not depend on its generics. */
type ArrayInputSlots = NonNullable<Parameters<typeof ArrayInput>[1]>["slots"];

/** The preview slot `<FileInput>` declares: a per-file preview child. */
type FileInputSlots = NonNullable<Parameters<typeof FileInput>[1]>["slots"];

/** The `controlSuffix` slot `<TextInput>` declares: it does not depend on its generics. */
type TextInputSlots = NonNullable<Parameters<typeof TextInput>[1]>["slots"];

/**
 * `ArrayInput` is generic over its record and its `source`, so its rows are
 * typed by the array at that `source`. A generic SFC has no constructor for
 * {@link Retyped} to read, so this is a function component like
 * {@link ValueMember}.
 */
type ArrayInputMember<TRecord> = <TPath extends SourceProp<TRecord>>(
  props: ArrayInputProps<TRecord, TPath> & VNodeProps & AllowedComponentProps,
  ctx?: { slots?: ArrayInputSlots },
) => VNode;

/**
 * The inputs whose `defaultValue` is typed by the value at `source`. Each is a
 * generic SFC, so it has no constructor for {@link Retyped} to read and the
 * member is a function component like {@link ArrayInputMember}: the raw props
 * interface where it carries no value callback, and {@link GenericValueMember}
 * where its `format`/`parse` must take the value at `source` too.
 */
type TypedInputMembers<TRecord> = {
  AutocompleteArrayInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: AutocompleteArrayInputProps<TRecord, TPath, TChoice> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  AutocompleteInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: AutocompleteInputProps<TRecord, TPath, TChoice> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  CheckboxGroupInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: CheckboxGroupInputProps<TRecord, TPath, TChoice> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  CurrencyInput: <TPath extends SourceProp<TRecord>>(
    props: CurrencyInputProps<TRecord, TPath> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  DatagridInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: DatagridInputProps<TRecord, TPath, TChoice> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  DateInput: GenericValueMember<DateInputProps, TRecord>;
  DateTimeInput: GenericValueMember<DateTimeInputProps, TRecord>;
  DurationInput: <TPath extends SourceProp<TRecord>>(
    props: DurationInputProps<TRecord, TPath> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  FileInput: GenericValueMember<FileInputProps, TRecord, FileInputSlots>;
  NumberInput: GenericValueMember<NumberInputProps, TRecord>;
  PasswordInput: GenericValueMember<PasswordInputProps, TRecord>;
  RatingInput: <TPath extends SourceProp<TRecord>>(
    props: RatingInputProps<TRecord, TPath> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  SelectArrayInput: <
    TPath extends SourceProp<TRecord>,
    TChoice extends ChoiceRecord = ChoiceRecord,
  >(
    props: SelectArrayInputProps<TRecord, TPath, TChoice> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  SubscriptionPlanPicker: <TPath extends SourceProp<TRecord>>(
    props: SubscriptionPlanPickerProps<TRecord, TPath> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  TextInput: GenericValueMember<TextInputProps, TRecord, TextInputSlots>;
  TimeInput: GenericValueMember<TimeInputProps, TRecord>;
  WebhookEndpointInput: <TPath extends SourceProp<TRecord>>(
    props: WebhookEndpointInputProps<TRecord, TPath> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
};

/**
 * The reference components are generic over the referenced name too, so
 * `reference` is a name of `TResources` and `target` a key of that resource's
 * record. A generic SFC has no constructor for {@link Retyped} to read, so each
 * is a function component like {@link ArrayInputMember}.
 */
type ReferenceMembers<
  TRecord extends ResourceRecord,
  TResources extends ResourceMap,
> = {
  ReferenceArrayField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceArrayFieldProps<TRecord, TResources, TReference> &
      VNodeProps &
      AllowedComponentProps,
    ctx?: {
      slots?: NonNullable<Parameters<typeof ReferenceArrayField>[1]>["slots"];
    },
  ) => VNode;
  ReferenceArrayInput: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceArrayInputProps<TResources, TReference> &
      VNodeProps &
      AllowedComponentProps,
    ctx?: {
      slots?: NonNullable<Parameters<typeof ReferenceArrayInput>[1]>["slots"];
    },
  ) => VNode;
  ReferenceField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceFieldProps<TRecord, TResources, TReference> &
      VNodeProps &
      AllowedComponentProps,
    ctx?: {
      slots?: NonNullable<Parameters<typeof ReferenceField>[1]>["slots"];
    },
  ) => VNode;
  ReferenceInput: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceInputProps<TResources, TReference> &
      VNodeProps &
      AllowedComponentProps,
  ) => VNode;
  ReferenceManyField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceManyFieldProps<TRecord, TResources, TReference> &
      VNodeProps &
      AllowedComponentProps,
    ctx?: {
      slots?: NonNullable<Parameters<typeof ReferenceManyField>[1]>["slots"];
    },
  ) => VNode;
  ReferenceOneField: <
    TReference extends keyof TResources & string = keyof TResources & string,
  >(
    props: ReferenceOneFieldProps<TRecord, TResources, TReference> &
      VNodeProps &
      AllowedComponentProps,
    ctx?: {
      slots?: NonNullable<Parameters<typeof ReferenceOneField>[1]>["slots"];
    },
  ) => VNode;
};

/**
 * A view with its `resource` prop removed. Templates are not strict about
 * undeclared attributes, so the prop stays as `never` to make
 * `<posts.Edit resource="users">` an error.
 */
type BoundView<TComponent extends Ctor> = Pick<TComponent, keyof TComponent> &
  (new (
    ...args: ConstructorParameters<TComponent>
  ) => Omit<InstanceType<TComponent>, "$props"> & {
    $props: Omit<InstanceType<TComponent>["$props"], "resource"> & {
      resource?: never;
    };
  });

/** The slots `<Create>` and `<Edit>` declare: they do not depend on their record. */
type CreateSlots = NonNullable<Parameters<typeof Create>[1]>["slots"];
type EditSlots = NonNullable<Parameters<typeof Edit>[1]>["slots"];

/**
 * `<Create>` is generic over its record, so a generic SFC has no constructor
 * for {@link BoundView} to read. This is a function component like
 * {@link ArrayInputMember}, with `resource` kept as `never` for the same reason.
 */
type CreateMember<TRecord> = (
  props: Omit<CreateProps<TRecord>, "resource"> & {
    resource?: never;
  } & VNodeProps &
    AllowedComponentProps,
  ctx?: { slots?: CreateSlots },
) => VNode;

/** `<Edit>` bound to a resource, typed by that resource's record. */
type EditMember<TRecord> = (
  props: Omit<EditProps<TRecord>, "resource"> & {
    resource?: never;
  } & VNodeProps &
    AllowedComponentProps,
  ctx?: { slots?: EditSlots },
) => VNode;

/**
 * What `createResourceComponents(name)` returns: the four views bound to
 * `TName`, and every field and input with `source` typed by `TName`'s record.
 */
export type ResourceComponents<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
> = {
  [K in keyof SourceMembers as SourceMembers[K] extends Ctor
    ? K extends keyof TypedInputMembers<LooseRecord>
      ? never
      : K
    : never]: ResourceMember<
    Extract<SourceMembers[K], Ctor>,
    RecordOf<TResources, TName>
  >;
} & TypedInputMembers<RecordOf<TResources, TName>> &
  TypedFieldMembers<RecordOf<TResources, TName>> &
  ReferenceMembers<RecordOf<TResources, TName>, TResources> & {
    ArrayInput: ArrayInputMember<RecordOf<TResources, TName>>;
    Edit: EditMember<RecordOf<TResources, TName>>;
    Create: CreateMember<RecordOf<TResources, TName>>;
    Show: BoundView<typeof Show>;
    List: BoundView<typeof List>;
  };

/** Wraps a view so it renders with `resource` set, passing attrs and slots on. */
function bindResource(
  view: Component,
  resource: string,
  displayName: string,
): Component {
  return defineComponent({
    name: displayName,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(view, { ...attrs, resource }, slots);
    },
  });
}

/** The members and the four bound views, before `ResourceComponents` retypes them. */
type BuiltComponents = SourceMembers & {
  Edit: Component;
  Create: Component;
  Show: Component;
  List: Component;
};

/**
 * The retyped members are not comparable to the SFCs they retype (a
 * `ValueMember` is a function, an SFC a constructor), so the caller's cast only
 * compiles when the target is part of the source's type.
 */
function build<TResources extends ResourceMap, TName extends string>(
  name: string,
): BuiltComponents | ResourceComponents<TResources, TName> {
  return {
    ...sourceMembers,
    Edit: bindResource(Edit, name, "ResourceEdit"),
    Create: bindResource(Create, name, "ResourceCreate"),
    Show: bindResource(Show, name, "ResourceShow"),
    List: bindResource(List, name, "ResourceList"),
  };
}

/**
 * The explicit-map form: `TResources` names the resources, so a type test can
 * pass `typeof resources` without augmenting `Register`, which is global to a
 * TypeScript program.
 */
export function createResourceComponentsOf<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(name: TName): ResourceComponents<TResources, TName> {
  // type-escape: builder: the members are the SFCs themselves; only their prop types are retyped
  return build<TResources, TName>(name) as ResourceComponents<
    TResources,
    TName
  >;
}

/**
 * The components of the registered resource `name`. Any name compiles until
 * `Register` is augmented; then an unknown name does not.
 */
export function createResourceComponents<TName extends RegisteredResourceName>(
  name: TName,
): ResourceComponents<RegisteredResources, TName> {
  return createResourceComponentsOf<RegisteredResources, TName>(name);
}
