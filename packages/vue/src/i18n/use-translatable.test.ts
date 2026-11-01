import { type AnyCheloneI18n, createI18n } from "@chelone/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import {
  provideTranslatable,
  type TranslatableContext,
  useTranslatable,
  useTranslatableContext,
} from "./use-translatable";

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

function makeI18n(locale: string): AnyCheloneI18n {
  return createI18n({
    locale,
    messages: { en: {}, fr: {}, de: {} },
  }) as AnyCheloneI18n;
}

/** Mount `child` under a context that carries `i18n` (or none). */
function mountWith(
  i18n: AnyCheloneI18n | undefined,
  child: () => unknown,
  errorHandler?: (error: unknown) => void,
) {
  const Child = defineComponent({ setup: child as never });
  const Host = defineComponent({
    setup() {
      provideCheloneContext({ dataProvider, i18n } as CheloneContextValue);
      return () => h(Child);
    },
  });
  return mount(Host, { global: { config: { errorHandler } } });
}

/** Render the selected locale; `result` hands back what the composable returned. */
function mountTranslatable(
  i18n: AnyCheloneI18n | undefined,
  use: () => TranslatableContext,
  errorHandler?: (error: unknown) => void,
) {
  const holder: { result?: TranslatableContext } = {};
  const wrapper = mountWith(
    i18n,
    () => {
      holder.result = use();
      return () => h("p", holder.result?.selectedLocale.value);
    },
    errorHandler,
  );
  return { wrapper, result: () => holder.result as TranslatableContext };
}

describe("useTranslatable", () => {
  it("useTranslatable starts on defaultLocale when it is listed", () => {
    const { wrapper } = mountTranslatable(makeI18n("en"), () =>
      useTranslatable({ locales: ["en", "fr"], defaultLocale: "fr" }),
    );
    expect(wrapper.text()).toBe("fr");
  });

  it("useTranslatable starts on the app locale when it is listed and no defaultLocale is given", () => {
    const { wrapper } = mountTranslatable(makeI18n("fr"), () =>
      useTranslatable({ locales: ["en", "fr"] }),
    );
    expect(wrapper.text()).toBe("fr");
  });

  it("useTranslatable starts on the first locale when the app locale is not listed", () => {
    const { wrapper } = mountTranslatable(makeI18n("de"), () =>
      useTranslatable({ locales: ["en", "fr"] }),
    );
    expect(wrapper.text()).toBe("en");
  });

  it("useTranslatable selectLocale updates selectedLocale for a component that reads it", async () => {
    const { wrapper, result } = mountTranslatable(makeI18n("en"), () =>
      useTranslatable({ locales: ["en", "fr"] }),
    );
    expect(wrapper.text()).toBe("en");

    result().selectLocale("fr");
    await nextTick();

    expect(wrapper.text()).toBe("fr");
  });

  it("useTranslatable keeps the selection when locales is a new array with the same entries", async () => {
    const locales = ref(["en", "fr"]);
    const { wrapper, result } = mountTranslatable(makeI18n("en"), () =>
      useTranslatable({ locales }),
    );
    result().selectLocale("fr");

    locales.value = ["en", "fr"];
    await nextTick();

    expect(wrapper.text()).toBe("fr");
  });

  it("useTranslatable moves off a selection that is no longer listed", async () => {
    const locales = ref(["en", "fr"]);
    const { wrapper, result } = mountTranslatable(makeI18n("en"), () =>
      useTranslatable({ locales }),
    );
    result().selectLocale("fr");

    locales.value = ["en", "de"];
    await nextTick();

    expect(wrapper.text()).toBe("en");
    expect(result().locales).toEqual(["en", "de"]);
  });

  it("useTranslatable reports an empty locales list and keeps the previous locales", async () => {
    const errors: unknown[] = [];
    const locales = ref(["en", "fr"]);
    const { wrapper, result } = mountTranslatable(
      makeI18n("en"),
      () => useTranslatable({ locales }),
      (error) => errors.push(error),
    );
    result().selectLocale("fr");

    locales.value = [];
    await nextTick();

    expect(errors).toHaveLength(1);
    expect(String(errors[0])).toContain("at least one locale");
    expect(result().locales).toEqual(["en", "fr"]);
    expect(wrapper.text()).toBe("fr");
  });

  it("useTranslatable works without an i18n instance", () => {
    const { wrapper } = mountTranslatable(undefined, () =>
      useTranslatable({ locales: ["fr", "en"] }),
    );
    expect(wrapper.text()).toBe("en");
  });

  it("useTranslatable getRecordForLocale picks the selected locale's values", async () => {
    const { result } = mountTranslatable(makeI18n("en"), () =>
      useTranslatable({ locales: ["en", "fr"] }),
    );
    const record = { id: 1, title: { en: "Hello", fr: "Bonjour" } };
    expect(result().getRecordForLocale(record)).toEqual({
      id: 1,
      title: "Hello",
    });

    result().selectLocale("fr");

    expect(result().getRecordForLocale(record)).toEqual({
      id: 1,
      title: "Bonjour",
    });
  });
});

describe("useTranslatableContext", () => {
  it("useTranslatableContext reads what a parent provided", async () => {
    const Reader = defineComponent({
      setup() {
        const { selectedLocale, selectLocale } = useTranslatableContext();
        return () =>
          h(
            "button",
            { onClick: () => selectLocale("fr") },
            selectedLocale.value,
          );
      },
    });
    const wrapper = mountWith(makeI18n("en"), () => {
      provideTranslatable(useTranslatable({ locales: ["en", "fr"] }));
      return () => h(Reader);
    });
    expect(wrapper.text()).toBe("en");

    await wrapper.get("button").trigger("click");

    expect(wrapper.text()).toBe("fr");
  });

  it("useTranslatableContext throws outside a provider", () => {
    expect(() => mountWith(undefined, () => useTranslatableContext())).toThrow(
      /provideTranslatable/,
    );
  });
});
