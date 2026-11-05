import { fakeDataProvider } from "@chelone/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import { useTranslate } from "./use-translate";

const dataProvider = fakeDataProvider({});

describe("useTranslate without i18n", () => {
  it("renders a { _: default } label with its placeholders filled in", () => {
    const Greeting = defineComponent({
      setup() {
        const translate = useTranslate();
        return () =>
          h("div", translate("app.greet", { _: "Hello {name}", name: "Ada" }));
      },
    });
    const Host = defineComponent({
      setup() {
        provideCheloneContext({ dataProvider } as CheloneContextValue);
        return () => h(Greeting);
      },
    });

    expect(mount(Host).text()).toBe("Hello Ada");
  });
});
