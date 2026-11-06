/**
 * `<OnboardingTour>` mounted the way an app does: once, inside the layout, under
 * a real `<Admin>`. Assertions are on DOM, roles and the store; jsdom applies no
 * CSS and measures nothing, so positions are not checked.
 */

import { createI18n, createStore, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Admin, Layout, Resource } from "../../../index";
import { OnboardingTour, type OnboardingTourProps } from "./onboarding-tour";

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const doneKey = "onboarding-tour.main.completed";
const stubPage = () => <div />;
const steps: OnboardingTourProps["steps"] = [
  { target: "#one", title: "First", content: "Look here" },
  { target: "#two", content: "Then here" },
  { target: "#three", title: "Last", content: "Finally" },
];

function mount(
  props: Partial<OnboardingTourProps> = {},
  store = createStore(),
) {
  function AppLayout({ children }: { children?: ReactNode }) {
    return (
      <>
        <OnboardingTour id="main" steps={steps} {...props} />
        <Layout>{children}</Layout>
      </>
    );
  }
  const view = render(
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={fakeDataProvider({ posts: [] })}
        queryClient={new QueryClient()}
        i18n={createI18n({ locale: "en", messages: { en: {} } })}
        store={store}
      >
        <Admin.Layout>
          <AppLayout />
        </Admin.Layout>
        <Resource name="posts" list={stubPage} />
      </Admin>
    </MemoryRouter>,
  );
  return { view, store };
}

function slot(name: string): HTMLElement {
  const el = document.body.querySelector<HTMLElement>(`[data-slot="${name}"]`);
  if (!el) throw new Error(`no [data-slot="${name}"]`);
  return el;
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
  it("should render the tour when not yet completed", () => {
    addTargets();
    mount();
    const card = screen.getByRole("dialog");
    expect(card.getAttribute("data-slot")).toBe("tour-card");
    expect(card.textContent).toContain("Look here");
    expect(card.textContent).toContain("1 / 3");
    expect(
      document.body.querySelector('[data-slot="onboarding-tour"]'),
    ).not.toBeNull();
  });

  it("should advance to the next step when Next is clicked", () => {
    addTargets();
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const card = screen.getByRole("dialog");
    expect(card.textContent).toContain("Then here");
    expect(card.textContent).toContain("2 / 3");
  });

  it("should show a Back button on the second step", () => {
    addTargets();
    mount();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog").textContent).toContain("Look here");
  });

  it("should show Finish on the last step instead of Next", () => {
    addTargets();
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByRole("button", { name: "Finish" })).toBeTruthy();
  });

  it("Finish closes the tour, stores it as done and calls onComplete with finished", () => {
    addTargets();
    const onComplete = vi.fn();
    const { store } = mount({ onComplete });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.getItem(doneKey)).toBe(true);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("finished");
  });

  it("Skip, Escape and a scrim click close the tour and store it as done", () => {
    const closers = [
      () => fireEvent.click(screen.getByRole("button", { name: "Skip" })),
      () => fireEvent.keyDown(document, { key: "Escape" }),
      () => fireEvent.click(slot("tour-scrim")),
    ];
    for (const close of closers) {
      addTargets();
      const onComplete = vi.fn();
      const { store } = mount({ onComplete });
      close();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(store.getItem(doneKey)).toBe(true);
      expect(onComplete).toHaveBeenCalledExactlyOnceWith("skipped");
      cleanup();
      document.body.innerHTML = "";
    }
  });

  it("does not open again once done, and opens when its store key is cleared", () => {
    addTargets();
    const store = createStore();
    store.setItem(doneKey, true);
    mount({}, store);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => store.removeItem(doneKey));
    expect(screen.getByRole("dialog").textContent).toContain("Look here");
  });

  it("a step whose target is missing or whose selector is invalid still shows its card", () => {
    mount({
      steps: [
        { target: "#nowhere", content: "Missing" },
        { target: "##[bad", content: "Invalid" },
      ],
    });
    const scrim = () =>
      document.body.querySelector<HTMLElement>('[data-slot="tour-scrim"]');
    expect(screen.getByRole("dialog").textContent).toContain("Missing");
    expect(scrim()?.style.clipPath).toBe("");
    expect(document.body.querySelector('[data-slot="tour-ring"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog").textContent).toContain("Invalid");
    expect(scrim()?.style.clipPath).toBe("");
  });

  it("highlights a present target with a cut-out scrim and a ring", () => {
    addTargets();
    const target = byId("one");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 50, 40, 20),
    );
    mount();
    const scrim = document.body.querySelector<HTMLElement>(
      '[data-slot="tour-scrim"]',
    );
    expect(scrim?.style.clipPath).toContain("100px 50px");
    expect(scrim?.style.clipPath).toContain("140px 70px");
    const ring = document.body.querySelector<HTMLElement>(
      '[data-slot="tour-ring"]',
    );
    expect(ring?.style.width).toBe("40px");
  });

  it("scrolls each step's target into view", () => {
    addTargets();
    mount();
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center" });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(
      document.getElementById("one"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(
      document.getElementById("two"),
    );
  });

  it("the card is a labelled dialog that takes focus and gives it back on close", () => {
    addTargets();
    const opener = byId("three");
    opener.focus();
    mount();
    const card = screen.getByRole("dialog", { name: "First" });
    expect(card.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Next" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByRole("dialog").getAttribute("aria-labelledby"),
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Next" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(document.activeElement).toBe(opener);
  });

  it("autoStart false keeps it closed", () => {
    addTargets();
    mount({ autoStart: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("re-measures every 250 ms while open", () => {
    vi.useFakeTimers();
    try {
      addTargets();
      const target = byId("one");
      const spy = vi
        .spyOn(target, "getBoundingClientRect")
        .mockReturnValue(new DOMRect(10, 10, 10, 10));
      mount();
      spy.mockReturnValue(new DOMRect(200, 10, 10, 10));
      act(() => {
        vi.advanceTimersByTime(250);
      });
      const ring = document.body.querySelector<HTMLElement>(
        '[data-slot="tour-ring"]',
      );
      expect(ring?.style.left).toBe("200px");
    } finally {
      vi.useRealTimers();
    }
  });
});
