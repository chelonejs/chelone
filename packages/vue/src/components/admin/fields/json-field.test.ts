import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { provideCheloneContext } from "../../../context";
import { provideRecordContext } from "../../../record/record-context";
import JsonField, { type JsonFieldProps } from "./json-field.vue";

function mountField(props: JsonFieldProps, record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no data" }) },
  });
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
        i18n,
      });
      provideRecordContext(record);
      // `JsonField` is generic in its record, so `h` only takes its props as a
      // fresh object literal, which carries the implicit index signature.
      return () => h(JsonField, { ...props });
    },
  });
  return mount(Harness);
}

describe("JsonField", () => {
  it("renders an object value as pretty-printed JSON", () => {
    const w = mountField(
      { source: "meta" },
      { id: 1, meta: { a: 1, b: [true] } },
    );
    expect(w.get("pre").text()).toBe(
      '{\n  "a": 1,\n  "b": [\n    true\n  ]\n}',
    );
    expect(w.get("pre").attributes("data-slot")).toBe("json-field");
  });

  it("re-indents a JSON string value", () => {
    const w = mountField({ source: "meta" }, { id: 1, meta: '{"a":1}' });
    expect(w.get("pre").text()).toBe('{\n  "a": 1\n}');
  });

  it("renders an unparseable string verbatim", () => {
    const w = mountField({ source: "meta" }, { id: 1, meta: "not json" });
    expect(w.get("pre").text()).toBe("not json");
  });

  it("honors a custom indent", () => {
    const w = mountField(
      { source: "meta", indent: 4 },
      { id: 1, meta: { a: 1 } },
    );
    expect(w.get("pre").text()).toBe('{\n    "a": 1\n}');
  });

  it("renders nothing for a null value without an empty prop", () => {
    const w = mountField({ source: "meta" }, { id: 1, meta: null });
    expect(w.find("pre").exists()).toBe(false);
    expect(w.find('[data-slot="json-field"]').exists()).toBe(false);
  });

  it("renders the translated empty string when the value is null", () => {
    const w = mountField(
      { source: "meta", empty: "myapp.empty" },
      { id: 1, meta: null },
    );
    expect(w.text()).toBe("no data");
    expect(w.find("pre").exists()).toBe(false);
  });

  it("merges class onto the pre element", () => {
    const w = mountField(
      { source: "meta", class: "extra" },
      { id: 1, meta: { a: 1 } },
    );
    expect(w.get("pre").classes()).toContain("extra");
    expect(w.get("pre").classes()).toContain("font-mono");
  });
});
