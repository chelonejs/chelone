import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { makeCheloneContext } from "../__fixtures__/chelone-context";
import { provideCheloneContext } from "../context";
import { useTranslate } from "./use-translate";

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
        provideCheloneContext(makeCheloneContext());
        return () => h(Greeting);
      },
    });

    expect(mount(Host).text()).toBe("Hello Ada");
  });
});
