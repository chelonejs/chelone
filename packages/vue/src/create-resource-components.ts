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
 * `ApiKeyField`, ...) are not members of the type. Their type is a function
 * with no constructor signature, so `Retyped` cannot replace their `source`
 * without erasing the generic. The test is the type itself, so an SFC that
 * becomes generic later drops out of `ResourceComponents` on its own, and a
 * template that uses it fails `vue-tsc` instead of the build. Import them
 * directly; their `source` keeps the registered union, or a plain string when
 * nothing is registered.
 */

import type {
  RecordOf,
  RegisteredResourceName,
  RegisteredResources,
  ResourceMap,
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
import ApiKeyField from "./components/admin/fields/api-key-field.vue";
import ArrayField from "./components/admin/fields/array-field.vue";
import BadgeField from "./components/admin/fields/badge-field.vue";
import BooleanField from "./components/admin/fields/boolean-field.vue";
import ChipField from "./components/admin/fields/chip-field.vue";
import ColorField from "./components/admin/fields/color-field.vue";
import CronField from "./components/admin/fields/cron-field.vue";
import CurrencyField from "./components/admin/fields/currency-field.vue";
import DateField from "./components/admin/fields/date-field.vue";
import DurationField from "./components/admin/fields/duration-field.vue";
import EmailField from "./components/admin/fields/email-field.vue";
import FileField from "./components/admin/fields/file-field.vue";
import FunctionField from "./components/admin/fields/function-field.vue";
import ImageField from "./components/admin/fields/image-field.vue";
import JsonField from "./components/admin/fields/json-field.vue";
import NumberField from "./components/admin/fields/number-field.vue";
import PhoneField from "./components/admin/fields/phone-field.vue";
import RatingField from "./components/admin/fields/rating-field.vue";
import RecordField from "./components/admin/fields/record-field.vue";
import ReferenceArrayField from "./components/admin/fields/reference-array-field.vue";
import ReferenceField from "./components/admin/fields/reference-field.vue";
import ReferenceManyCount from "./components/admin/fields/reference-many-count.vue";
import ReferenceManyField from "./components/admin/fields/reference-many-field.vue";
import ReferenceOneField from "./components/admin/fields/reference-one-field.vue";
import SelectField from "./components/admin/fields/select-field.vue";
import SubscriptionPlanField from "./components/admin/fields/subscription-plan-field.vue";
import TextArrayField from "./components/admin/fields/text-array-field.vue";
import TextField from "./components/admin/fields/text-field.vue";
import UrlField from "./components/admin/fields/url-field.vue";
import UsageMeterField from "./components/admin/fields/usage-meter-field.vue";
import WebhookEndpointField from "./components/admin/fields/webhook-endpoint-field.vue";
import WrapperField from "./components/admin/fields/wrapper-field.vue";
import ApiKeyInput from "./components/admin/inputs/api-key-input.vue";
import ArrayInput, {
  type ArrayInputProps,
} from "./components/admin/inputs/array-input.vue";
import ArrayInputRow from "./components/admin/inputs/array-input-row.vue";
import AutocompleteArrayInput from "./components/admin/inputs/autocomplete-array-input.vue";
import AutocompleteInput from "./components/admin/inputs/autocomplete-input.vue";
import BooleanInput from "./components/admin/inputs/boolean-input.vue";
import CheckboxGroupInput from "./components/admin/inputs/checkbox-group-input.vue";
import ColorInput from "./components/admin/inputs/color-input.vue";
import CronInput from "./components/admin/inputs/cron-input.vue";
import CurrencyInput from "./components/admin/inputs/currency-input.vue";
import DatagridInput from "./components/admin/inputs/datagrid-input.vue";
import DateInput from "./components/admin/inputs/date-input.vue";
import DateTimeInput from "./components/admin/inputs/date-time-input.vue";
import DurationInput from "./components/admin/inputs/duration-input.vue";
import FileInput from "./components/admin/inputs/file-input.vue";
import FileInputPreview from "./components/admin/inputs/file-input-preview.vue";
import ImageInput from "./components/admin/inputs/image-input.vue";
import ImageInputThumbnail from "./components/admin/inputs/image-input-thumbnail.vue";
import LoadingInput from "./components/admin/inputs/loading-input.vue";
import NullableBooleanInput from "./components/admin/inputs/nullable-boolean-input.vue";
import NumberInput from "./components/admin/inputs/number-input.vue";
import PasswordInput from "./components/admin/inputs/password-input.vue";
import PhoneInput from "./components/admin/inputs/phone-input.vue";
import RadioButtonGroupInput from "./components/admin/inputs/radio-button-group-input.vue";
import RatingInput from "./components/admin/inputs/rating-input.vue";
import ReferenceArrayInput from "./components/admin/inputs/reference-array-input.vue";
import ReferenceInput from "./components/admin/inputs/reference-input.vue";
import ResettableTextInput from "./components/admin/inputs/resettable-text-input.vue";
import SearchInput from "./components/admin/inputs/search-input.vue";
import SelectArrayInput from "./components/admin/inputs/select-array-input.vue";
import SelectInput from "./components/admin/inputs/select-input.vue";
import SubscriptionPlanPicker from "./components/admin/inputs/subscription-plan-picker.vue";
import TextArrayInput from "./components/admin/inputs/text-array-input.vue";
import TextInput from "./components/admin/inputs/text-input.vue";
import TimeInput from "./components/admin/inputs/time-input.vue";
import WebhookEndpointInput from "./components/admin/inputs/webhook-endpoint-input.vue";
import Create from "./components/admin/view/create.vue";
import Edit from "./components/admin/view/edit.vue";
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
 * `TValue` in place of the value they took, returned or held. Each stays
 * optional and keeps the rest of its signature, and one `P` lacks is not added.
 */
type ValueEntries<P, TValue> = {
  [K in Extract<keyof P, "format" | "transform">]?: (
    value: TValue,
  ) => CallbackResult<P[K]>;
} & {
  [K in Extract<keyof P, "parse">]?: (value: CallbackParam<P[K]>) => TValue;
} & {
  [K in Extract<keyof P, "defaultValue">]?: TValue;
};

/**
 * A member whose props have a `format`, `parse`, `transform` or `defaultValue`: a generic
 * function component over the literal `source`, so those callbacks take the
 * value at it. Volar reads a function component's props off its first
 * parameter and its slots off the second. `NoInfer` keeps `TPath` from being inferred back through
 * `SourceValue` out of a callback's parameter, which overflows the type depth.
 */
type ValueMember<TComponent extends Ctor, TRecord> = <
  TPath extends SourceProp<TRecord>,
>(
  props: Omit<
    InstanceType<TComponent>["$props"],
    "source" | "format" | "parse" | "transform" | "defaultValue"
  > &
    (Partial<Pick<InstanceType<TComponent>["$props"], "source">> extends Pick<
      InstanceType<TComponent>["$props"],
      "source"
    >
      ? { source?: TPath }
      : { source: TPath }) &
    ValueEntries<
      InstanceType<TComponent>["$props"],
      NoInfer<SourceValue<TRecord, TPath>>
    >,
  ctx?: { slots?: InstanceType<TComponent>["$slots"] },
) => VNode;

/** The member type: {@link ValueMember} when the props have a value entry, else {@link Retyped}. */
type ResourceMember<TComponent extends Ctor, TRecord> = [
  keyof InstanceType<TComponent>["$props"] &
    ("format" | "parse" | "transform" | "defaultValue"),
] extends [never]
  ? Retyped<TComponent, SourceProp<TRecord>>
  : ValueMember<TComponent, TRecord>;

/** The slots `<ArrayInput>` declares: they do not depend on its generics. */
type ArrayInputSlots = NonNullable<Parameters<typeof ArrayInput>[1]>["slots"];

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

/**
 * What `createResourceComponents(name)` returns: the four views bound to
 * `TName`, and every field and input with `source` typed by `TName`'s record.
 */
export type ResourceComponents<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
> = {
  [K in keyof SourceMembers as SourceMembers[K] extends Ctor
    ? K
    : never]: ResourceMember<
    Extract<SourceMembers[K], Ctor>,
    RecordOf<TResources, TName>
  >;
} & {
  ArrayInput: ArrayInputMember<RecordOf<TResources, TName>>;
  Edit: BoundView<typeof Edit>;
  Create: BoundView<typeof Create>;
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
  // type-escape: the members are the SFCs themselves; only their prop types are retyped
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
