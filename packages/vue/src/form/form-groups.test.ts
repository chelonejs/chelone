import {
  createFormGroups,
  type FormGroups,
  fakeDataProvider,
  type GroupState,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import {
  defineComponent,
  h,
  nextTick,
  type Ref,
  ref,
  type VNodeChild,
} from "vue";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import FormGroupProvider from "./form-group-provider.vue";
import {
  provideFormGroups,
  useFormGroup,
  useFormGroupName,
  useFormGroups,
  useOptionalFormGroups,
} from "./form-groups";
import FormGroupsProvider from "./form-groups-provider.vue";
import { type UseFormReturn, useForm } from "./use-form";
import { type UseInputReturn, useInput } from "./use-input";

type Post = { id: number; title: string; views: number };

interface Capture {
  form?: UseFormReturn<Post>;
  registry?: FormGroups;
  state?: Readonly<Ref<GroupState>>;
  inputs: Record<string, UseInputReturn>;
}

const Input = defineComponent({
  inheritAttrs: false,
  props: { source: { type: String, required: true } },
  setup(props, { attrs }) {
    const capture = attrs.capture as Capture;
    const validate = attrs.validate as
      | ((value: unknown) => string | undefined)
      | undefined;
    capture.inputs[props.source] = useInput({
      source: props.source,
      validate,
    });
    return () => null;
  },
});

const Badge = defineComponent({
  inheritAttrs: false,
  props: { name: { type: String, required: true } },
  setup(props, { attrs }) {
    const capture = attrs.capture as Capture;
    capture.state = useFormGroup(() => props.name);
    return () => null;
  },
});

const RegistryProbe = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs }) {
    (attrs.capture as Capture).registry = useFormGroups();
    return () => null;
  },
});

/** `<Admin>`-less harness: ambient form + a `children` render under it. */
function mountForm(
  capture: Capture,
  children: (capture: Capture) => VNodeChild,
  record: Post = { id: 1, title: "start", views: 0 },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const FormProbe = defineComponent({
    setup() {
      capture.form = useForm<Post>({
        record,
        onSubmit: async () => undefined,
      });
      return () => children(capture);
    },
  });
  const Provider = defineComponent({
    setup() {
      const ctx: CheloneContextValue = {
        dataProvider: fakeDataProvider({}),
        queryClient,
      };
      provideCheloneContext(ctx);
      return () => h(FormProbe);
    },
  });
  return mount(Provider);
}

const registryOf = (capture: Capture): FormGroups => {
  if (!capture.registry) throw new Error("no registry captured");
  return capture.registry;
};
const stateOf = (capture: Capture): Readonly<Ref<GroupState>> => {
  if (!capture.state) throw new Error("no group state captured");
  return capture.state;
};

describe("form groups", () => {
  it("an input inside a FormGroupProvider joins the group and leaves it on unmount", async () => {
    const capture: Capture = { inputs: {} };
    const show = ref(true);
    mountForm(capture, () =>
      h(FormGroupsProvider, null, () => [
        h(RegistryProbe, { capture }),
        h(FormGroupProvider, { name: "main" }, () =>
          show.value ? h(Input, { source: "title", capture }) : null,
        ),
      ]),
    );
    await nextTick();
    expect(registryOf(capture).getMembers("main")).toEqual(["title"]);

    show.value = false;
    await nextTick();
    expect(registryOf(capture).getMembers("main")).toEqual([]);
  });

  it("useFormGroup is invalid while a member fails its validator and valid once it passes", async () => {
    const capture: Capture = { inputs: {} };
    const required = (value: unknown) => (value ? undefined : "required");
    mountForm(
      capture,
      () =>
        h(FormGroupsProvider, null, () => [
          h(FormGroupProvider, { name: "main" }, () =>
            h(Input, { source: "title", capture, validate: required }),
          ),
          h(Badge, { name: "main", capture }),
        ]),
      { id: 1, title: "", views: 0 },
    );
    await flushPromises();

    // Validate-on-submit: the first submit arms the validators.
    await capture.form?.submit();
    await flushPromises();
    expect(stateOf(capture).value.isValid).toBe(false);
    expect(stateOf(capture).value.errors).toEqual({ title: "required" });

    capture.inputs.title?.setValue("hello");
    await flushPromises();
    expect(stateOf(capture).value.isValid).toBe(true);
    expect(stateOf(capture).value.isDirty).toBe(true);
  });

  it("useFormGroup keeps the same state object when a field outside the group changes", async () => {
    const capture: Capture = { inputs: {} };
    mountForm(capture, () =>
      h(FormGroupsProvider, null, () => [
        h(FormGroupProvider, { name: "main" }, () =>
          h(Input, { source: "title", capture }),
        ),
        h(Input, { source: "views", capture }),
        h(Badge, { name: "main", capture }),
      ]),
    );
    await flushPromises();
    const before = stateOf(capture).value;

    capture.inputs.views?.setValue(42);
    await flushPromises();
    expect(stateOf(capture).value).toBe(before);

    capture.inputs.title?.setValue("changed");
    await flushPromises();
    expect(stateOf(capture).value).not.toBe(before);
    expect(stateOf(capture).value.isDirty).toBe(true);
  });

  it("useFormGroups throws without a FormGroupsProvider", () => {
    const capture: Capture = { inputs: {} };
    expect(() =>
      mountForm(capture, () => h(RegistryProbe, { capture })),
    ).toThrow(
      "useFormGroups: no <FormGroupsProvider> found above this component.",
    );
  });

  it("an input outside any group registers nothing and does not throw", async () => {
    const capture: Capture = { inputs: {} };
    let optional: FormGroups | undefined;
    const Optional = defineComponent({
      setup() {
        optional = useOptionalFormGroups();
        return () => null;
      },
    });
    const Owner = defineComponent({
      setup() {
        const registry = provideFormGroups();
        capture.registry = registry;
        return () => h(Input, { source: "title", capture });
      },
    });
    mountForm(capture, () => h(Optional));
    expect(optional).toBeUndefined();

    mountForm(capture, () => h(Owner));
    await nextTick();
    expect(registryOf(capture).getMembers("main")).toEqual([]);
    expect(capture.inputs.title?.name).toBe("title");

    // Inside a registry but with no group name: still nothing registered.
    mountForm(capture, () =>
      h(FormGroupsProvider, null, () => [
        h(RegistryProbe, { capture }),
        h(Input, { source: "title", capture }),
      ]),
    );
    await nextTick();
    expect(registryOf(capture).getMembers("title")).toEqual([]);
  });
  it("an input moves to the new group when the FormGroupProvider name changes", async () => {
    const capture: Capture = { inputs: {} };
    const groupName = ref("a");
    mountForm(capture, () =>
      h(FormGroupsProvider, null, () => [
        h(RegistryProbe, { capture }),
        h(FormGroupProvider, { name: groupName.value }, () =>
          h(Input, { source: "title", capture }),
        ),
      ]),
    );
    await nextTick();
    expect(registryOf(capture).getMembers("a")).toEqual(["title"]);

    groupName.value = "b";
    await nextTick();
    expect(registryOf(capture).getMembers("a")).toEqual([]);
    expect(registryOf(capture).getMembers("b")).toEqual(["title"]);
  });

  it("useFormGroup follows its name when the badge's name prop changes", async () => {
    const capture: Capture = { inputs: {} };
    const required = (value: unknown) => (value ? undefined : "required");
    const tab = ref("a");
    mountForm(
      capture,
      () =>
        h(FormGroupsProvider, null, () => [
          h(FormGroupProvider, { name: "b" }, () =>
            h(Input, { source: "title", capture, validate: required }),
          ),
          h(Badge, { name: tab.value, capture }),
        ]),
      { id: 1, title: "", views: 0 },
    );
    await flushPromises();
    await capture.form?.submit();
    await flushPromises();
    expect(stateOf(capture).value.isValid).toBe(true);

    tab.value = "b";
    await flushPromises();
    expect(stateOf(capture).value.isValid).toBe(false);
    expect(stateOf(capture).value.errors).toEqual({ title: "required" });
  });

  it("inputs and badges switch to the registry passed as the groups prop", async () => {
    const capture: Capture = { inputs: {} };
    const first = createFormGroups();
    const second = createFormGroups();
    const groups = ref(first);
    mountForm(capture, () =>
      h(FormGroupsProvider, { groups: groups.value }, () => [
        h(FormGroupProvider, { name: "main" }, () =>
          h(Input, { source: "title", capture }),
        ),
        h(Badge, { name: "main", capture }),
      ]),
    );
    await nextTick();
    expect(first.getMembers("main")).toEqual(["title"]);

    groups.value = second;
    await nextTick();
    expect(first.getMembers("main")).toEqual([]);
    expect(second.getMembers("main")).toEqual(["title"]);

    capture.inputs.title?.setValue("changed");
    await flushPromises();
    expect(stateOf(capture).value.isDirty).toBe(true);
  });
  it("an input under nested FormGroupProviders registers into every enclosing group", async () => {
    const capture: Capture = { inputs: {} };
    const required = (value: unknown) => (value ? undefined : "required");
    const states: Record<string, Readonly<Ref<GroupState>>> = {};
    let name: Readonly<Ref<string | undefined>> | undefined;
    const NamedBadge = defineComponent({
      props: { name: { type: String, required: true } },
      setup(props) {
        states[props.name] = useFormGroup(() => props.name);
        return () => null;
      },
    });
    const NameProbe = defineComponent({
      setup() {
        name = useFormGroupName();
        return () => null;
      },
    });
    mountForm(
      capture,
      () =>
        h(FormGroupsProvider, null, () => [
          h(RegistryProbe, { capture }),
          h(FormGroupProvider, { name: "outer" }, () =>
            h(FormGroupProvider, { name: "inner" }, () => [
              h(Input, { source: "title", capture, validate: required }),
              h(NameProbe),
            ]),
          ),
          h(NamedBadge, { name: "outer" }),
          h(NamedBadge, { name: "inner" }),
        ]),
      { id: 1, title: "", views: 0 },
    );
    await flushPromises();
    expect(registryOf(capture).getMembers("outer")).toEqual(["title"]);
    expect(registryOf(capture).getMembers("inner")).toEqual(["title"]);

    await capture.form?.submit();
    await flushPromises();
    expect(states.outer?.value.isValid).toBe(false);
    expect(states.inner?.value.isValid).toBe(false);
    expect(name?.value).toBe("inner");
  });

  it("useFormGroupName resolves the ambient name when first read after setup", async () => {
    const capture: Capture = { inputs: {} };
    const groupName = ref("main");
    let name: Readonly<Ref<string | undefined>> | undefined;
    const NameProbe = defineComponent({
      setup() {
        name = useFormGroupName();
        return () => null;
      },
    });
    mountForm(capture, () =>
      h(FormGroupProvider, { name: groupName.value }, () => h(NameProbe)),
    );
    await nextTick();
    // First read happens outside setup, where no instance is active.
    expect(name?.value).toBe("main");

    groupName.value = "other";
    await nextTick();
    expect(name?.value).toBe("other");
  });
});
