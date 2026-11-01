import { type AnyCheloneI18n, createI18n } from "@chelone/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import {
  useLocale,
  useLocaleState,
  useLocales,
  useSetLocale,
} from "./use-locale";
import { useTranslate } from "./use-translate";

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

function makeI18n(): AnyCheloneI18n {
  return createI18n({
    locale: "en",
    messages: {
      en: { greeting: "Hello" },
      fr: { greeting: "Bonjour" },
    },
  }) as AnyCheloneI18n;
}

/** Mount `child` under a context that carries `i18n` (or none). */
function mountWith(i18n: AnyCheloneI18n | undefined, child: () => unknown) {
  const Child = defineComponent({ setup: child as never });
  const Host = defineComponent({
    setup() {
      provideCheloneContext({ dataProvider, i18n } as CheloneContextValue);
      return () => h(Child);
    },
  });
  return mount(Host);
}

describe("useLocale", () => {
  it("useLocale follows setLocale", async () => {
    const i18n = makeI18n();
    const wrapper = mountWith(i18n, () => {
      const locale = useLocale();
      return () => h("p", locale.value);
    });
    expect(wrapper.text()).toBe("en");

    i18n.setLocale("fr");
    await nextTick();

    expect(wrapper.text()).toBe("fr");
  });

  it("useLocale gives en without an i18n instance", () => {
    const wrapper = mountWith(undefined, () => {
      const locale = useLocale();
      return () => h("p", locale.value);
    });
    expect(wrapper.text()).toBe("en");
  });

  it("the i18n subscription is released when the component unmounts", () => {
    const i18n = makeI18n();
    const release = vi.fn();
    const subscribe = vi.spyOn(i18n, "subscribe").mockImplementation((cb) => {
      const off = createI18n({ locale: "en", messages: { en: {} } }).subscribe(
        cb,
      );
      return () => {
        release();
        off();
      };
    });
    const wrapper = mountWith(i18n, () => {
      useLocale();
      return () => h("p");
    });
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();

    wrapper.unmount();

    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("useLocales", () => {
  /** The `useLocales()` result for `i18n`, read from inside a component. */
  function localesWith(i18n: AnyCheloneI18n | undefined) {
    let result: ReturnType<typeof useLocales> = [];
    mountWith(i18n, () => {
      result = useLocales();
      return () => h("p");
    });
    return result;
  }

  it("useLocales names each locale in its own language", () => {
    expect(localesWith(makeI18n())).toEqual([
      { locale: "en", name: "English" },
      { locale: "fr", name: "français" },
    ]);
  });

  it("useLocales keeps the code as the name for a tag Intl rejects", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { greeting: "Hello" }, "not a tag!": {} },
    }) as AnyCheloneI18n;
    expect(localesWith(i18n)).toEqual([
      { locale: "en", name: "English" },
      { locale: "not a tag!", name: "not a tag!" },
    ]);
  });

  it("useLocales is empty without an i18n instance", () => {
    expect(localesWith(undefined)).toEqual([]);
  });
});

describe("useSetLocale", () => {
  it("useSetLocale changes the i18n locale", () => {
    const i18n = makeI18n();
    mountWith(i18n, () => {
      const setLocale = useSetLocale();
      setLocale("fr");
      return () => h("p");
    });
    expect(i18n.getLocale()).toBe("fr");
  });
});

describe("useLocaleState", () => {
  it("useLocaleState returns the locale and its setter", async () => {
    const i18n = makeI18n();
    const wrapper = mountWith(i18n, () => {
      const [locale, setLocale] = useLocaleState();
      return () =>
        h("button", { onClick: () => setLocale("fr") }, locale.value);
    });
    expect(wrapper.text()).toBe("en");

    await wrapper.get("button").trigger("click");

    expect(i18n.getLocale()).toBe("fr");
    expect(wrapper.text()).toBe("fr");
  });
});

describe("useTranslate", () => {
  it("a component's translated text re-renders after setLocale", async () => {
    const i18n = makeI18n();
    const wrapper = mountWith(i18n, () => {
      const translate = useTranslate();
      return () => h("p", translate("greeting"));
    });
    expect(wrapper.text()).toBe("Hello");

    i18n.setLocale("fr");
    await nextTick();

    expect(wrapper.text()).toBe("Bonjour");
  });
});
