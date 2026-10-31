import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import { provideVueRouterAdapter } from "../router/vue-router-adapter";
import { type UseFormReturn, useForm } from "./use-form";
import {
  useWarnWhenUnsavedChanges,
  type WarnWhenUnsavedChangesDecision,
} from "./use-warn-when-unsaved-changes";

interface Post {
  title: string;
}

const Blank = defineComponent({ setup: () => () => h("div") });

interface HostOptions {
  enable?: Ref<boolean>;
  formRootPathname?: string;
  withRouter?: boolean;
}

const mounted: VueWrapper[] = [];

async function mountHost(opts: HostOptions = {}) {
  const { enable = ref(true), formRootPathname = "/posts/1" } = opts;
  const { withRouter = true } = opts;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: Blank }],
  });
  await router.push("/posts/1");
  await router.isReady();

  const captured: {
    form?: UseFormReturn<Post>;
    decision?: WarnHostDecision;
  } = {};

  const Warn = defineComponent({
    setup() {
      captured.decision = useWarnWhenUnsavedChanges(enable, formRootPathname);
      return () => null;
    },
  });
  const FormHost = defineComponent({
    setup() {
      captured.form = useForm<Post>({
        record: { title: "original" },
        onSubmit: async () => undefined,
      });
      return () => h(Warn);
    },
  });
  const Root = defineComponent({
    setup() {
      const ctx: CheloneContextValue = {
        dataProvider: {} as CheloneContextValue["dataProvider"],
        queryClient: new QueryClient(),
      };
      provideCheloneContext(ctx);
      if (withRouter) provideVueRouterAdapter();
      return () => h(FormHost);
    },
  });
  const wrapper = mount(Root, { global: { plugins: [router] } });
  mounted.push(wrapper);

  const form = () => {
    if (!captured.form) throw new Error("form did not mount");
    return captured.form;
  };
  const decision = () => {
    if (!captured.decision) throw new Error("hook did not run");
    return captured.decision;
  };
  const edit = async (title: string) => {
    form().form.setFieldValue("title", title);
    await nextTick();
  };
  return { router, wrapper, form, decision, edit };
}

type WarnHostDecision = WarnWhenUnsavedChangesDecision;

async function go(router: Router, to: string) {
  const navigation = router.push(to);
  await flushPromises();
  return navigation;
}

function fireBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

describe("useWarnWhenUnsavedChanges", () => {
  it("a dirty form blocks navigation away and proceed lets it through", async () => {
    const { router, decision, edit } = await mountHost();
    await edit("changed");

    const navigation = go(router, "/posts");
    await flushPromises();

    expect(decision().isBlocked.value).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1");

    decision().proceed();
    await navigation;
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/posts");
    expect(decision().isBlocked.value).toBe(false);
  });

  it("cancel keeps the user on the form with the edits intact", async () => {
    const { router, decision, edit, form } = await mountHost();
    await edit("changed");

    const navigation = go(router, "/posts");
    await flushPromises();
    expect(decision().isBlocked.value).toBe(true);

    decision().cancel();
    await navigation;
    await flushPromises();

    expect(decision().isBlocked.value).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1");
    expect(form().form.state.values.title).toBe("changed");
  });

  it("a clean form does not block", async () => {
    const { router, decision } = await mountHost();

    await go(router, "/posts");

    expect(decision().isBlocked.value).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/posts");
  });

  it("an edit reverted to the original value does not block", async () => {
    const { router, decision, edit } = await mountHost();
    await edit("changed");
    await edit("original");

    await go(router, "/posts");

    expect(decision().isBlocked.value).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/posts");
  });

  it("navigation inside the form root is allowed and the show view counts as leaving", async () => {
    const { router, decision, edit } = await mountHost();
    await edit("changed");

    await go(router, "/posts/1/tab");
    expect(decision().isBlocked.value).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/tab");

    void go(router, "/posts/1/show");
    await flushPromises();
    expect(decision().isBlocked.value).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/tab");
  });

  it("the form root defaults to the current pathname", async () => {
    const { router, decision, edit } = await mountHost({
      formRootPathname: undefined,
    });
    await edit("changed");

    await go(router, "/posts/1/tab");
    expect(decision().isBlocked.value).toBe(false);

    void go(router, "/posts");
    await flushPromises();
    expect(decision().isBlocked.value).toBe(true);
  });

  it("a successful save clears the block", async () => {
    const { router, decision, edit, form } = await mountHost();
    await edit("changed");

    await form().submit();
    await flushPromises();
    await go(router, "/posts");

    expect(decision().isBlocked.value).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/posts");
  });

  it("enable false turns off both halves", async () => {
    const enable = ref(false);
    const { router, decision, edit } = await mountHost({ enable });
    await edit("changed");

    expect(fireBeforeUnload()).toBe(false);
    await go(router, "/posts");
    expect(decision().isBlocked.value).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/posts");

    await router.push("/posts/1");
    enable.value = true;
    await nextTick();
    expect(fireBeforeUnload()).toBe(true);
    void go(router, "/posts");
    await flushPromises();
    expect(decision().isBlocked.value).toBe(true);
  });

  it("beforeunload is prevented only while dirty and the listener is removed on unmount", async () => {
    const { wrapper, edit } = await mountHost();
    expect(fireBeforeUnload()).toBe(false);

    await edit("changed");
    expect(fireBeforeUnload()).toBe(true);

    await edit("original");
    expect(fireBeforeUnload()).toBe(false);

    await edit("changed");
    wrapper.unmount();
    expect(fireBeforeUnload()).toBe(false);
  });

  it("without a router adapter it never blocks, warns once and still guards beforeunload", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { decision, edit } = await mountHost({ withRouter: false });

    await edit("changed");
    await edit("changed again");

    expect(decision().isBlocked.value).toBe(false);
    expect(() => {
      decision().proceed();
      decision().cancel();
    }).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(fireBeforeUnload()).toBe(true);
  });
});
