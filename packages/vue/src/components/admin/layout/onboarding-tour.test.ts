/**
 * `<OnboardingTour>` mounted the way an app does: once, inside the `#layout`
 * slot of a real `<Admin>`. Assertions are on DOM, roles and the store; jsdom
 * applies no CSS and measures nothing, so positions are not checked.
 */

import {
  createI18n,
  createStore,
  fakeDataProvider,
  type TourEnd,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import OnboardingTour, {
  type OnboardingTourProps,
  type TourStep,
} from "./onboarding-tour.vue";

const scrollIntoView = vi.fn();
const mounted: VueWrapper[] = [];

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const doneKey = "onboarding-tour.main.completed";
const Blank = defineComponent({ setup: () => () => h("div") });
const steps: OnboardingTourProps["steps"] = [
  { target: "#one", title: "First", content: "Look here" },
  { target: "#two", content: "Then here" },
  { target: "#three", title: "Last", content: "Finally" },
];

interface MountOptions {
  props?: Partial<OnboardingTourProps>;
  listeners?: { onComplete?: (reason: TourEnd) => void };
  slots?: { step?: (scope: { step: TourStep; index: number }) => VNodeChild };
  store?: ReturnType<typeof createStore>;
}

async function mountTour(options: MountOptions = {}) {
  const store = options.store ?? createStore();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  await router.push("/");
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({ posts: [] }),
      store,
      queryClient: new QueryClient(),
      i18n: createI18n({ locale: "en", messages: { en: {} } }),
    },
    slots: {
      default: () => h(Resource, { name: "posts", list: Blank }),
      layout: () => [
        h(
          OnboardingTour,
          { id: "main", steps, ...options.props, ...options.listeners },
          options.slots,
        ),
        h("main", "app"),
      ],
    },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, store };
}

function slot(name: string): HTMLElement {
  const el = document.body.querySelector<HTMLElement>(`[data-slot="${name}"]`);
  if (!el) throw new Error(`no [data-slot="${name}"]`);
  return el;
}

const dialog = () =>
  document.body.querySelector<HTMLElement>('[role="dialog"]');

function button(name: string): HTMLButtonElement {
  const found = [...document.body.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === name,
  );
  if (!found) throw new Error(`no "${name}" button`);
  return found;
}

const queryButton = (name: string) =>
  [...document.body.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === name,
  );

async function click(el: HTMLElement) {
  el.click();
  await flushPromises();
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no #${id}`);
  return el;
}

function addTargets() {
  for (const id of ["one", "two", "three"]) {
    const el = document.createElement("button");
    el.id = id;
    el.textContent = id;
    document.body.append(el);
  }
}

describe("<OnboardingTour>", () => {
  it("should render the tour when not yet completed", async () => {
    addTargets();
    await mountTour();
    const card = dialog();
    expect(card?.getAttribute("data-slot")).toBe("tour-card");
    expect(card?.textContent).toContain("Look here");
    expect(card?.textContent).toContain("1 / 3");
    expect(slot("onboarding-tour").parentElement).toBe(document.body);
  });

  it("should advance to the next step when Next is clicked", async () => {
    addTargets();
    await mountTour();
    await click(button("Next"));
    expect(dialog()?.textContent).toContain("Then here");
    expect(dialog()?.textContent).toContain("2 / 3");
  });

  it("should show a Back button on the second step", async () => {
    addTargets();
    await mountTour();
    expect(queryButton("Back")).toBeUndefined();
    await click(button("Next"));
    await click(button("Back"));
    expect(dialog()?.textContent).toContain("Look here");
  });

  it("should show Finish on the last step instead of Next", async () => {
    addTargets();
    await mountTour();
    await click(button("Next"));
    await click(button("Next"));
    expect(queryButton("Next")).toBeUndefined();
    expect(queryButton("Finish")).toBeDefined();
  });

  it("Finish closes the tour, stores it as done and emits complete with finished", async () => {
    addTargets();
    const onComplete = vi.fn();
    const { store } = await mountTour({ listeners: { onComplete } });
    await click(button("Next"));
    await click(button("Next"));
    await click(button("Finish"));
    expect(dialog()).toBeNull();
    expect(store.getItem(doneKey)).toBe(true);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("finished");
  });

  it("Skip, Escape and a scrim click close the tour and store it as done", async () => {
    const closers = [
      () => click(button("Skip")),
      async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await flushPromises();
      },
      () => click(slot("tour-scrim")),
    ];
    for (const close of closers) {
      addTargets();
      const onComplete = vi.fn();
      const { store } = await mountTour({ listeners: { onComplete } });
      await close();
      expect(dialog()).toBeNull();
      expect(store.getItem(doneKey)).toBe(true);
      expect(onComplete).toHaveBeenCalledExactlyOnceWith("skipped");
      for (const wrapper of mounted.splice(0)) wrapper.unmount();
      document.body.innerHTML = "";
    }
  });

  it("does not open again once done, and opens when its store key is cleared", async () => {
    addTargets();
    const store = createStore();
    store.setItem(doneKey, true);
    await mountTour({ store });
    expect(dialog()).toBeNull();
    store.removeItem(doneKey);
    await flushPromises();
    expect(dialog()?.textContent).toContain("Look here");
  });

  it("a step whose target is missing or whose selector is invalid still shows its card", async () => {
    await mountTour({
      props: {
        steps: [
          { target: "#nowhere", content: "Missing" },
          { target: "##[bad", content: "Invalid" },
        ],
      },
    });
    const scrim = () =>
      document.body.querySelector<HTMLElement>('[data-slot="tour-scrim"]');
    expect(dialog()?.textContent).toContain("Missing");
    expect(scrim()?.style.clipPath).toBe("");
    expect(document.body.querySelector('[data-slot="tour-ring"]')).toBeNull();
    await click(button("Next"));
    expect(dialog()?.textContent).toContain("Invalid");
    expect(scrim()?.style.clipPath).toBe("");
  });

  it("highlights a present target with a cut-out scrim and a ring", async () => {
    addTargets();
    vi.spyOn(byId("one"), "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 50, 40, 20),
    );
    await mountTour();
    const scrim = slot("tour-scrim");
    expect(scrim.style.clipPath).toContain("100px 50px");
    expect(scrim.style.clipPath).toContain("140px 70px");
    expect(slot("tour-ring").style.width).toBe("40px");
  });

  it("scrolls each step's target into view", async () => {
    addTargets();
    await mountTour();
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center" });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(byId("one"));
    await click(button("Next"));
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(byId("two"));
  });

  it("the card is a labelled dialog that takes focus and gives it back on close", async () => {
    addTargets();
    const opener = byId("three");
    opener.focus();
    await mountTour();
    const card = dialog();
    expect(card?.getAttribute("aria-modal")).toBe("true");
    const labelId = card?.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId ?? "")?.textContent).toBe("First");
    expect(document.activeElement).toBe(button("Next"));
    await click(button("Next"));
    expect(dialog()?.getAttribute("aria-labelledby")).toBeNull();
    expect(document.activeElement).toBe(button("Next"));
    await click(button("Skip"));
    expect(document.activeElement).toBe(opener);
  });

  it("keeps Tab inside the card while the tour is open", async () => {
    addTargets();
    const outside = byId("three");
    await mountTour();
    const skip = button("Skip");
    const next = button("Next");
    const tab = (target: HTMLElement, shiftKey = false) => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(tab(next)).toBe(true);
    expect(document.activeElement).toBe(skip);
    expect(tab(skip, true)).toBe(true);
    expect(document.activeElement).toBe(next);
    // Tab between the card's own buttons is left to the browser.
    skip.focus();
    expect(tab(skip)).toBe(false);

    outside.focus();
    expect(document.activeElement).toBe(next);
  });

  it("autoStart false keeps it closed", async () => {
    addTargets();
    await mountTour({ props: { autoStart: false } });
    expect(dialog()).toBeNull();
  });

  it("re-measures every 250 ms while open", async () => {
    vi.useFakeTimers();
    try {
      addTargets();
      const spy = vi
        .spyOn(byId("one"), "getBoundingClientRect")
        .mockReturnValue(new DOMRect(10, 10, 10, 10));
      await mountTour();
      spy.mockReturnValue(new DOMRect(200, 10, 10, 10));
      await vi.advanceTimersByTimeAsync(250);
      expect(slot("tour-ring").style.left).toBe("200px");
    } finally {
      vi.useRealTimers();
    }
  });

  it("the step slot replaces the title and content", async () => {
    addTargets();
    await mountTour({
      slots: {
        step: ({ step, index }) =>
          h("p", { "data-testid": "custom" }, `#${index}: ${step.title}`),
      },
    });
    const card = dialog();
    expect(card?.querySelector("[data-testid=custom]")?.textContent).toBe(
      "#0: First",
    );
    expect(card?.textContent).not.toContain("Look here");
    expect(card?.querySelector("h2")).toBeNull();
    expect(card?.textContent).toContain("1 / 3");
  });
});
