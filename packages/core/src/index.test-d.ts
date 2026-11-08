import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  AnyCheloneI18n,
  AnySourcePath,
  AnySourcePathOf,
  CheloneLocation,
  Exporter,
  FilterSourceKey,
  I18nProvider,
  LocationState,
  LooseRecord,
  NavigateOpts,
  PathMatch,
  Register,
  RegisteredRecord,
  RegisteredResourceName,
  RegisteredResources,
  ResourceMap,
  RouterPort,
  RowSourcePath,
  SourceKey,
  SourcePath,
  SourceProp,
  SourceValue,
  TranslateParamValues,
  Unsubscribe,
} from "./index";
import {
  createI18n,
  type DataProvider,
  defineMessages,
  defineResources,
  type RecordOf,
} from "./index";

it("re-exports defineResources and inference types from the root", () => {
  const resources = defineResources({
    posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  });
  expectTypeOf<RecordOf<typeof resources, "posts">>().toEqualTypeOf<{
    id: number;
    title: string;
  }>();
  expectTypeOf<DataProvider<typeof resources>>().not.toBeNever();
});

it("re-exports the P6 router types from the root", () => {
  expectTypeOf<
    CheloneLocation["searchParams"]
  >().toEqualTypeOf<URLSearchParams>();
  expectTypeOf<NavigateOpts["state"]>().toEqualTypeOf<
    LocationState | undefined
  >();
  expectTypeOf<NavigateOpts["state"]>().not.toBeAny();
  expectTypeOf<PathMatch["params"]>().toEqualTypeOf<Record<string, string>>();
  expectTypeOf<RouterPort["navigate"]>().toBeFunction();
  expectTypeOf<Unsubscribe>().toEqualTypeOf<() => void>();
});

it("re-exports the Register and source-path types from the root", () => {
  const typed = defineResources({
    posts: { schema: z.object({ id: z.number(), title: z.string() }) },
    comments: {},
  });
  expectTypeOf<Register>().toBeObject();
  expectTypeOf<keyof Register>().toEqualTypeOf<never>();
  expectTypeOf<RegisteredResources>().toEqualTypeOf<ResourceMap>();
  expectTypeOf<RegisteredResourceName>().toEqualTypeOf<string>();
  expectTypeOf<RegisteredRecord<string>>().toEqualTypeOf<LooseRecord>();
  expectTypeOf<AnySourcePath>().toEqualTypeOf<string>();
  expectTypeOf<AnySourcePathOf<typeof typed>>().toEqualTypeOf<string>();
  expectTypeOf<SourceProp>().toEqualTypeOf<AnySourcePath>();
  expectTypeOf<SourcePath<LooseRecord>>().toEqualTypeOf<string>();
  expectTypeOf<RowSourcePath<LooseRecord>>().toEqualTypeOf<string>();
  expectTypeOf<FilterSourceKey<LooseRecord>>().toEqualTypeOf<
    "q" | `${string}_${string}`
  >();
  expectTypeOf<SourceKey<LooseRecord>>().toEqualTypeOf<string>();
  expectTypeOf<SourceValue<LooseRecord, "anything">>().toEqualTypeOf<unknown>();
});

it("re-exports the i18n provider contract, with AnyCheloneI18n as its alias", () => {
  expectTypeOf<I18nProvider>().toEqualTypeOf<AnyCheloneI18n>();
  expectTypeOf<I18nProvider["translate"]>().parameters.toEqualTypeOf<
    [key: string, params?: TranslateParamValues]
  >();
  expectTypeOf<I18nProvider["translate"]>().returns.toEqualTypeOf<string>();
  expectTypeOf<I18nProvider["getLocale"]>().returns.toEqualTypeOf<string>();
  expectTypeOf<I18nProvider["setLocale"]>().parameters.toEqualTypeOf<
    [locale: string]
  >();
  expectTypeOf<I18nProvider["setLocale"]>().returns.toEqualTypeOf<void>();
  expectTypeOf<I18nProvider["getLocales"]>().returns.toEqualTypeOf<string[]>();
  expectTypeOf<I18nProvider["subscribe"]>().parameters.toEqualTypeOf<
    [callback: () => void]
  >();
  expectTypeOf<I18nProvider["subscribe"]>().returns.toEqualTypeOf<() => void>();
});

it("createI18n returns a value assignable to I18nProvider", () => {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.save": "Save",
        "chelone.greeting": "Hello {name}",
      }),
      fr: defineMessages({ "chelone.action.save": "Enregistrer" }),
    },
  });
  expectTypeOf(i18n).toMatchTypeOf<I18nProvider>();
  const provider: I18nProvider = i18n;
  expectTypeOf(
    provider.translate("any.key", { name: "Rin" }),
  ).toEqualTypeOf<string>();
});

it("re-exports the Exporter type from the root", () => {
  expectTypeOf<Exporter>().toBeFunction();
  expectTypeOf<Exporter>().parameters.toEqualTypeOf<
    [data: LooseRecord[], dataProvider: DataProvider, resource: string]
  >();
  expectTypeOf<Exporter>().returns.toEqualTypeOf<void | Promise<void>>();
});
