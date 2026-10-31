import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  isNavigationFailure,
  NavigationFailureType,
  type RouteRecordRaw,
} from "vue-router";
import type { RouterBlocker } from "./adapter";
import { useBlocker, useCanBlock } from "./nav-composables";
import { provideVueRouterAdapter } from "./vue-router-adapter";

const Blank = defineComponent({ setup: () => () => h("div") });

const ROUTES: RouteRecordRaw[] = [
  { path: "/", component: Blank },
  { path: "/posts", component: Blank },
  { path: "/posts/:id", component: Blank },
];

type ShouldBlock = Parameters<typeof useBlocker>[0];

async function mountBlocker(
  shouldBlock: ShouldBlock,
  opts: { provideAdapter?: boolean } = {},
) {
  const { provideAdapter = true } = opts;
  const history = createMemoryHistory();
  const router = createRouter({ history, routes: ROUTES });
  await router.push("/");
  await router.isReady();

  let blocker!: RouterBlocker;
  let canBlock!: boolean;
  const Child = defineComponent({
    setup() {
      blocker = useBlocker(shouldBlock);
      canBlock = useCanBlock();
      return () => h("div");
    },
  });
  const Root = defineComponent({
    setup() {
      if (provideAdapter) provideVueRouterAdapter();
      return () => h(Child);
    },
  });
  const wrapper = mount(Root, { global: { plugins: [router] } });
  return { router, history, wrapper, blocker, canBlock };
}

describe("useBlocker — vue-router adapter", () => {
  it("useBlocker blocks a navigation the predicate rejects and reports the target location", async () => {
    const predicate = (args: {
      currentLocation: { pathname: string };
      nextLocation: { pathname: string };
    }) => args.nextLocation.pathname.startsWith("/posts");
    const { router, blocker, canBlock } = await mountBlocker(predicate);

    expect(canBlock).toBe(true);
    expect(blocker.state.value).toBe("unblocked");
    expect(blocker.location.value).toBeNull();

    void router.push("/posts/7?tab=a#top");
    await flushPromises();

    expect(blocker.state.value).toBe("blocked");
    expect(blocker.location.value).toMatchObject({
      pathname: "/posts/7",
      search: "?tab=a",
      hash: "#top",
    });
    expect(router.currentRoute.value.fullPath).toBe("/");
  });

  it("proceed lets the blocked navigation through and the state ends unblocked", async () => {
    const { router, blocker } = await mountBlocker(true);

    const navigation = router.push("/posts");
    await flushPromises();
    expect(blocker.state.value).toBe("blocked");

    blocker.proceed();
    expect(blocker.state.value).toBe("proceeding");
    expect(blocker.location.value?.pathname).toBe("/posts");

    await navigation;
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/posts");
    expect(blocker.state.value).toBe("unblocked");
    expect(blocker.location.value).toBeNull();
  });

  it("reset cancels the navigation and the route stays put", async () => {
    const { router, blocker } = await mountBlocker(true);

    const navigation = router.push("/posts");
    await flushPromises();
    blocker.reset();
    const failure = await navigation;

    expect(failure).toBeTruthy();
    expect(router.currentRoute.value.fullPath).toBe("/");
    expect(blocker.state.value).toBe("unblocked");
    expect(blocker.location.value).toBeNull();
  });

  it("proceed and reset do nothing unless blocked", async () => {
    const { router, blocker } = await mountBlocker(false);

    blocker.proceed();
    blocker.reset();

    expect(blocker.state.value).toBe("unblocked");
    await router.push("/posts");
    expect(router.currentRoute.value.fullPath).toBe("/posts");
  });

  it("a false predicate, boolean or ref lets every navigation through", async () => {
    const viaPredicate = await mountBlocker(() => false);
    await viaPredicate.router.push("/posts");
    expect(viaPredicate.router.currentRoute.value.fullPath).toBe("/posts");
    expect(viaPredicate.blocker.state.value).toBe("unblocked");

    const viaBoolean = await mountBlocker(false);
    await viaBoolean.router.push("/posts");
    expect(viaBoolean.router.currentRoute.value.fullPath).toBe("/posts");

    const flag = ref(false);
    const viaRef = await mountBlocker(flag);
    await viaRef.router.push("/posts");
    expect(viaRef.router.currentRoute.value.fullPath).toBe("/posts");

    flag.value = true;
    void viaRef.router.push("/posts/1");
    await flushPromises();
    expect(viaRef.blocker.state.value).toBe("blocked");
  });

  it("a second navigation while blocked cancels the first", async () => {
    const { router, blocker } = await mountBlocker(
      ({ nextLocation }) => nextLocation.pathname === "/posts",
    );

    const first = router.push("/posts");
    await flushPromises();
    expect(blocker.state.value).toBe("blocked");

    const second = router.push("/posts/2");
    await flushPromises();

    expect(
      isNavigationFailure(await first, NavigationFailureType.cancelled),
    ).toBe(true);
    expect(await second).toBeUndefined();
    expect(router.currentRoute.value.fullPath).toBe("/posts/2");
    expect(blocker.state.value).toBe("unblocked");
    expect(blocker.location.value).toBeNull();
  });

  it("a second back navigation while blocked leaves the URL and the route in step", async () => {
    const flag = ref(false);
    const { router, history, blocker } = await mountBlocker(flag);
    await router.push("/posts");
    await router.push("/posts/1");
    flag.value = true;

    router.go(-1);
    await flushPromises();
    expect(blocker.location.value?.pathname).toBe("/posts");

    router.go(-1);
    await flushPromises();
    expect(blocker.location.value?.pathname).toBe("/");

    blocker.proceed();
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/");
    expect(history.location).toBe("/");
  });

  it("the guard is removed when the scope is disposed", async () => {
    const { router, wrapper, blocker } = await mountBlocker(true);

    const held = router.push("/posts");
    await flushPromises();
    expect(blocker.state.value).toBe("blocked");

    wrapper.unmount();
    expect(await held).toBeTruthy();
    expect(blocker.state.value).toBe("unblocked");

    await router.push("/posts/3");
    expect(router.currentRoute.value.fullPath).toBe("/posts/3");
  });

  it("useBlocker throws without a RouterAdapter", async () => {
    await expect(mountBlocker(true, { provideAdapter: false })).rejects.toThrow(
      /no RouterAdapter/,
    );
  });
});
