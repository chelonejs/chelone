/**
 * The dependency-free `tabs` family, mounted the way a consumer composes it.
 * Selection follows focus (Radix's automatic activation), so the keyboard tests
 * attach to the document: `focus()` only fires in a connected tree.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./index";

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

interface TabsProps {
  modelValue?: string;
  defaultValue?: string;
  "onUpdate:modelValue"?: (value: string) => void;
}

interface TabSpec {
  value: string;
  disabled?: boolean;
}

const ABC: TabSpec[] = [{ value: "a" }, { value: "b" }, { value: "c" }];

/** One tab set: a trigger and a panel (text `panel <value>`) per spec. */
function tabSet(specs: TabSpec[], tabsProps: TabsProps): ReturnType<typeof h> {
  return h(Tabs, tabsProps, () => [
    h(TabsList, {}, () =>
      specs.map((spec) =>
        h(
          TabsTrigger,
          { key: spec.value, value: spec.value, disabled: spec.disabled },
          () => `tab ${spec.value}`,
        ),
      ),
    ),
    ...specs.map((spec) =>
      h(
        TabsContent,
        { key: spec.value, value: spec.value },
        () => `panel ${spec.value}`,
      ),
    ),
  ]);
}

function mountTabs(specs: TabSpec[], tabsProps: TabsProps): VueWrapper {
  const wrapper = mount(
    defineComponent({ render: () => tabSet(specs, tabsProps) }),
    {
      attachTo: document.body,
    },
  );
  wrappers.push(wrapper);
  return wrapper;
}

function tab(wrapper: VueWrapper, name: string) {
  const found = wrapper
    .findAll<HTMLButtonElement>('[role="tab"]')
    .find((candidate) => candidate.text() === `tab ${name}`);
  if (!found) throw new Error(`no tab ${name}`);
  return found;
}

function panels(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[role="tabpanel"]').map((panel) => panel.text());
}

function selected(wrapper: VueWrapper): string[] {
  return wrapper
    .findAll('[role="tab"][aria-selected="true"]')
    .map((trigger) => trigger.text());
}

describe("<Tabs>", () => {
  it("shows the panel of the default value and marks its trigger selected", () => {
    const wrapper = mountTabs(ABC, { defaultValue: "b" });

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    expect(panels(wrapper)).toEqual(["panel b"]);
    expect(selected(wrapper)).toEqual(["tab b"]);
    expect(tab(wrapper, "b").attributes("data-state")).toBe("active");
    expect(tab(wrapper, "b").attributes("tabindex")).toBe("0");
    expect(tab(wrapper, "a").attributes("data-state")).toBe("inactive");
    expect(tab(wrapper, "a").attributes("aria-selected")).toBe("false");
    expect(tab(wrapper, "a").attributes("tabindex")).toBe("-1");
  });

  it("a click on a trigger selects it and emits update:modelValue", async () => {
    const updates: string[] = [];
    const wrapper = mountTabs(ABC, {
      defaultValue: "a",
      "onUpdate:modelValue": (value: string) => updates.push(value),
    });

    await tab(wrapper, "c").trigger("click");

    expect(updates).toEqual(["c"]);
    expect(panels(wrapper)).toEqual(["panel c"]);
    expect(selected(wrapper)).toEqual(["tab c"]);
  });

  it("a controlled modelValue decides the active tab", async () => {
    const updates: string[] = [];
    const wrapper = mountTabs(ABC, {
      modelValue: "a",
      "onUpdate:modelValue": (value: string) => updates.push(value),
    });

    await tab(wrapper, "b").trigger("click");
    expect(updates).toEqual(["b"]);
    expect(panels(wrapper)).toEqual(["panel a"]);

    const controlled = mount(
      defineComponent({
        props: { active: { type: String, required: true } },
        render() {
          return tabSet(ABC, { modelValue: this.active });
        },
      }),
      { props: { active: "a" } },
    );
    wrappers.push(controlled);
    await controlled.setProps({ active: "c" });
    expect(panels(controlled)).toEqual(["panel c"]);
    expect(selected(controlled)).toEqual(["tab c"]);
  });

  it("ArrowRight and ArrowLeft move selection and focus, wrapping at the ends", async () => {
    const wrapper = mountTabs(ABC, { defaultValue: "a" });
    tab(wrapper, "a").element.focus();

    await tab(wrapper, "a").trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(tab(wrapper, "b").element);
    expect(selected(wrapper)).toEqual(["tab b"]);
    expect(panels(wrapper)).toEqual(["panel b"]);

    await tab(wrapper, "b").trigger("keydown", { key: "ArrowRight" });
    await tab(wrapper, "c").trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(tab(wrapper, "a").element);
    expect(selected(wrapper)).toEqual(["tab a"]);

    await tab(wrapper, "a").trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tab(wrapper, "c").element);
    expect(selected(wrapper)).toEqual(["tab c"]);

    await tab(wrapper, "c").trigger("keydown", { key: "ArrowLeft" });
    expect(selected(wrapper)).toEqual(["tab b"]);
  });

  it("Home and End select the first and last trigger", async () => {
    const wrapper = mountTabs(ABC, { defaultValue: "b" });
    tab(wrapper, "b").element.focus();

    await tab(wrapper, "b").trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(tab(wrapper, "c").element);
    expect(selected(wrapper)).toEqual(["tab c"]);

    await tab(wrapper, "c").trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(tab(wrapper, "a").element);
    expect(selected(wrapper)).toEqual(["tab a"]);
  });

  it("skips a disabled trigger and ignores a click on it", async () => {
    const updates: string[] = [];
    const wrapper = mountTabs(
      [{ value: "a" }, { value: "b", disabled: true }, { value: "c" }],
      {
        defaultValue: "a",
        "onUpdate:modelValue": (value: string) => updates.push(value),
      },
    );
    tab(wrapper, "a").element.focus();

    await tab(wrapper, "a").trigger("keydown", { key: "ArrowRight" });
    expect(selected(wrapper)).toEqual(["tab c"]);

    await tab(wrapper, "c").trigger("keydown", { key: "ArrowLeft" });
    expect(selected(wrapper)).toEqual(["tab a"]);

    await tab(wrapper, "b").trigger("click");
    expect(selected(wrapper)).toEqual(["tab a"]);
    expect(updates).toEqual(["c", "a"]);
  });

  it("each trigger controls its panel through aria-controls and aria-labelledby", () => {
    const wrapper = mountTabs(ABC, { defaultValue: "b" });

    const trigger = tab(wrapper, "b");
    const panel = wrapper.get('[role="tabpanel"]');
    expect(trigger.attributes("id")).toBeTruthy();
    expect(panel.attributes("id")).toBeTruthy();
    expect(trigger.attributes("aria-controls")).toBe(panel.attributes("id"));
    expect(panel.attributes("aria-labelledby")).toBe(trigger.attributes("id"));
  });

  it("two tab sets on one page get different ids", () => {
    const first = mountTabs(ABC, { defaultValue: "a" });
    const second = mountTabs(ABC, { defaultValue: "a" });

    const firstIds = first.findAll("[id]").map((el) => el.attributes("id"));
    const secondIds = second.findAll("[id]").map((el) => el.attributes("id"));
    expect(firstIds.length).toBeGreaterThan(0);
    for (const id of firstIds) expect(secondIds).not.toContain(id);
    expect(tab(first, "a").attributes("aria-controls")).not.toBe(
      tab(second, "a").attributes("aria-controls"),
    );
  });
});
