/**
 * `<WizardForm>` mounted under a real `<Admin>` with a memory router. jsdom
 * applies no CSS: assert DOM, roles and data-provider calls, never styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import SaveButton from "../components/admin/buttons/save-button.vue";
import TextInput from "../components/admin/inputs/text-input.vue";
import Edit from "../components/admin/view/edit.vue";
import {
  type UseWizardFormResult,
  useWizardFormContext,
} from "./use-wizard-form";
import WizardForm from "./wizard-form.vue";
import WizardFormStep from "./wizard-form-step.vue";

const required = (value: unknown) => (value ? undefined : "required");

interface Captured {
  wizard?: UseWizardFormResult;
}

/** Records the wizard controller for the test to drive. */
function makeProbe(captured: Captured) {
  return defineComponent({
    setup() {
      captured.wizard = useWizardFormContext();
      return () => null;
    },
  });
}

/** Mount `render()` inside `<Admin>` + a memory router. */
function mountAdmin(
  render: () => unknown,
  dataProvider = fakeDataProvider({
    posts: [{ id: 1, title: "Hello World", body: "First body" }],
  }),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider };
}

/** Three steps: "one" has a required title, "two" a body, "three" a slug. */
const threeSteps =
  (extra: () => unknown[] = () => []) =>
  () => [
    h(WizardFormStep, { name: "one" }, () => [
      h(TextInput, { source: "title", validate: required }),
    ]),
    h(WizardFormStep, { name: "two" }, () => [
      h(TextInput, { source: "body" }),
    ]),
    h(WizardFormStep, { name: "three" }, () => [
      h(TextInput, { source: "slug" }),
    ]),
    ...extra(),
  ];

const step = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.get(`[data-chelone-wizard-step="${name}"]`);
const inputValue = (wrapper: ReturnType<typeof mount>, name: string) =>
  elementOf(step(wrapper, name).get("input").element, HTMLInputElement).value;

const mountWizard = (captured: Captured, props: Record<string, unknown> = {}) =>
  mountAdmin(() =>
    h(
      WizardForm,
      { save: async () => undefined, ...props },
      threeSteps(() => [h(makeProbe(captured))]),
    ),
  );

describe("<WizardForm>", () => {
  it("shows only the first step and keeps every step's inputs mounted", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    expect(step(wrapper, "one").attributes("hidden")).toBeUndefined();
    expect(step(wrapper, "two").attributes("hidden")).toBeDefined();
    expect(step(wrapper, "three").attributes("hidden")).toBeDefined();
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(3);
    expect(captured.wizard?.currentStep.value).toBe(0);
    expect(captured.wizard?.hasPrev.value).toBe(false);
    expect(captured.wizard?.hasNext.value).toBe(true);
  });

  it("next stays on the step while a field in it is invalid and advances once it is valid", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    expect(await captured.wizard?.next()).toBe(false);
    await flushPromises();
    expect(captured.wizard?.currentStep.value).toBe(0);
    expect(step(wrapper, "one").text()).toContain("required");
    expect(step(wrapper, "two").attributes("hidden")).toBeDefined();

    await step(wrapper, "one").get("input").setValue("a title");
    expect(await captured.wizard?.next()).toBe(true);
    await nextTick();

    expect(captured.wizard?.currentStep.value).toBe(1);
    expect(captured.wizard?.hasPrev.value).toBe(true);
    expect(step(wrapper, "one").attributes("hidden")).toBeDefined();
    expect(step(wrapper, "two").attributes("hidden")).toBeUndefined();
  });

  it("only validates the current step", async () => {
    const captured: Captured = {};
    const { wrapper } = mountAdmin(() =>
      h(WizardForm, { save: async () => undefined }, () => [
        h(WizardFormStep, { name: "one" }, () => [
          h(TextInput, { source: "title" }),
        ]),
        h(WizardFormStep, { name: "two" }, () => [
          h(TextInput, { source: "body", validate: required }),
        ]),
        h(makeProbe(captured)),
      ]),
    );
    await flushPromises();

    expect(await captured.wizard?.next()).toBe(true);
    expect(wrapper.text()).not.toContain("required");
  });

  it("next on the last step resolves false and prev on the first is a no-op", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    captured.wizard?.prev();
    expect(captured.wizard?.currentStep.value).toBe(0);

    await step(wrapper, "one").get("input").setValue("a title");
    expect(await captured.wizard?.next()).toBe(true);
    expect(await captured.wizard?.next()).toBe(true);
    expect(captured.wizard?.currentStep.value).toBe(2);
    expect(captured.wizard?.hasNext.value).toBe(false);

    expect(await captured.wizard?.next()).toBe(false);
    expect(captured.wizard?.currentStep.value).toBe(2);

    captured.wizard?.prev();
    expect(captured.wizard?.currentStep.value).toBe(1);
  });

  it("goToStep clamps into the step range", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    captured.wizard?.goToStep(99);
    await nextTick();
    expect(captured.wizard?.currentStep.value).toBe(2);
    expect(step(wrapper, "three").attributes("hidden")).toBeUndefined();

    captured.wizard?.goToStep(-5);
    expect(captured.wizard?.currentStep.value).toBe(0);

    captured.wizard?.goToStep(1);
    expect(captured.wizard?.currentStep.value).toBe(1);
  });

  it("two next calls made before the first resolves advance one step, not two", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    await step(wrapper, "one").get("input").setValue("a title");
    const results = await Promise.all([
      captured.wizard?.next(),
      captured.wizard?.next(),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(captured.wizard?.currentStep.value).toBe(1);
  });

  it("a prev made while next is validating is not overwritten", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    captured.wizard?.goToStep(1);
    const pending = captured.wizard?.next();
    captured.wizard?.prev();

    expect(await pending).toBe(false);
    expect(captured.wizard?.currentStep.value).toBe(0);
    expect(step(wrapper, "one").attributes("hidden")).toBeUndefined();
  });

  it("goToStep rounds a fractional index and sends NaN to the first step", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    captured.wizard?.goToStep(1.5);
    await nextTick();
    expect(captured.wizard?.currentStep.value).toBe(1);
    expect(step(wrapper, "two").attributes("hidden")).toBeUndefined();

    captured.wizard?.goToStep(Number.NaN);
    expect(captured.wizard?.currentStep.value).toBe(0);
  });

  it("keeps a step visible when the last step is removed", async () => {
    const captured: Captured = {};
    const showThree = ref(true);
    const { wrapper } = mountAdmin(() =>
      h(WizardForm, { save: async () => undefined }, () => [
        h(WizardFormStep, { name: "one" }, () => [
          h(TextInput, { source: "title" }),
        ]),
        h(WizardFormStep, { name: "two" }, () => [
          h(TextInput, { source: "body" }),
        ]),
        ...(showThree.value
          ? [
              h(WizardFormStep, { name: "three" }, () => [
                h(TextInput, { source: "slug" }),
              ]),
            ]
          : []),
        h(makeProbe(captured)),
      ]),
    );
    await flushPromises();
    captured.wizard?.goToStep(2);
    await nextTick();

    showThree.value = false;
    await flushPromises();

    expect(captured.wizard?.currentStep.value).toBe(1);
    expect(captured.wizard?.hasNext.value).toBe(false);
    expect(step(wrapper, "two").attributes("hidden")).toBeUndefined();
  });

  it("a value typed on a step survives navigating away and back", async () => {
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured);
    await flushPromises();

    await step(wrapper, "one").get("input").setValue("a title");
    await captured.wizard?.next();
    await step(wrapper, "two").get("input").setValue("kept");
    captured.wizard?.prev();
    await captured.wizard?.next();

    expect(inputValue(wrapper, "two")).toBe("kept");
  });

  it("with save, submit collects every step and calls save once", async () => {
    const save = vi.fn(async () => undefined);
    const captured: Captured = {};
    const { wrapper } = mountWizard(captured, { save });
    await flushPromises();

    await step(wrapper, "one").get("input").setValue("T");
    await step(wrapper, "two").get("input").setValue("B");
    await step(wrapper, "three").get("input").setValue("S");
    await captured.wizard?.submit();
    await flushPromises();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: "T", body: "B", slug: "S" });
  });

  it("inside Edit the steps show the record and Save calls update", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Hello World", body: "First body" }],
    });
    const updateSpy = vi.spyOn(dataProvider, "update");
    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          { resource: "posts", id: 1, redirectOnSave: false },
          {
            default: () =>
              h(WizardForm, null, () => [
                h(WizardFormStep, { name: "one" }, () => [
                  h(TextInput, { source: "title" }),
                ]),
                h(WizardFormStep, { name: "two" }, () => [
                  h(TextInput, { source: "body" }),
                ]),
              ]),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() =>
      expect(inputValue(wrapper, "one")).toBe("Hello World"),
    );
    expect(inputValue(wrapper, "two")).toBe("First body");

    await step(wrapper, "two").get("input").setValue("Edited body");
    await nextTick();
    await wrapper.get('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const persisted = await dataProvider.getOne("posts", { id: 1 });
    expect(persisted.data).toMatchObject({
      title: "Hello World",
      body: "Edited body",
    });
  });

  it("outside a view and without save it throws the missing-save error", () => {
    expect(() => mountAdmin(() => h(WizardForm, null, threeSteps()))).toThrow(
      "<WizardForm> needs a `save` prop outside a view that provides a form (<Edit>, <Create>).",
    );
  });
});

describe("useWizardFormContext", () => {
  it("useWizardFormContext throws outside a WizardForm", () => {
    const Probe = defineComponent({
      setup() {
        useWizardFormContext();
        return () => null;
      },
    });
    expect(() => mount(Probe)).toThrow(
      "useWizardFormContext: no <WizardForm> found above this component.",
    );
  });
});
