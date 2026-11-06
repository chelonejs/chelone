/**
 * The native-element form primitives, each mounted alone: a user edits the
 * control and the component emits `update:modelValue` with what it now holds.
 */

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Checkbox from "./checkbox.vue";
import Input from "./input.vue";
import NativeSelect from "./native-select.vue";
import Switch from "./switch.vue";
import Textarea from "./textarea.vue";

describe("form controls", () => {
  it("Input emits the typed value", async () => {
    const wrapper = mount(Input);
    await wrapper.get("input").setValue("hello");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello"]]);
  });

  it("Textarea emits the typed value", async () => {
    const wrapper = mount(Textarea);
    await wrapper.get("textarea").setValue("some\ntext");
    expect(wrapper.emitted("update:modelValue")).toEqual([["some\ntext"]]);
  });

  it("Checkbox emits the checked state", async () => {
    const wrapper = mount(Checkbox, { props: { modelValue: false } });
    await wrapper.get("input").setValue(true);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
    await wrapper.get("input").setValue(false);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true], [false]]);
  });

  it("Switch emits the checked state", async () => {
    const wrapper = mount(Switch, { props: { modelValue: false } });
    await wrapper.get('input[role="switch"]').setValue(true);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
    await wrapper.get('input[role="switch"]').setValue(false);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true], [false]]);
  });

  it("NativeSelect emits the chosen value", async () => {
    const wrapper = mount(NativeSelect, {
      props: {
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
      },
    });
    await wrapper.get("select").setValue("b");
    expect(wrapper.emitted("update:modelValue")).toEqual([["b"]]);
  });
});
