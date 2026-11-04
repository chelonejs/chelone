import { describe, expect, it, vi } from "vitest";
import { createStore } from "../store/store";
import { createTourController, onboardingTourKey } from "./tour-controller";

describe("onboardingTourKey", () => {
  it("is the key shadmin kept the done flag under", () => {
    expect(onboardingTourKey("intro")).toBe("onboarding-tour.intro.completed");
  });
});

describe("createTourController", () => {
  it("opens on subscribe when autoStart is set and the tour is not done", () => {
    const tour = createTourController({
      id: "intro",
      stepCount: 3,
      store: createStore(),
    });
    expect(tour.getSnapshot()).toEqual({ active: false, index: 0 });
    tour.subscribe(() => {});
    expect(tour.getSnapshot()).toEqual({ active: true, index: 0 });
  });

  it("stays closed until start() when autoStart is off", () => {
    const tour = createTourController({
      id: "intro",
      stepCount: 3,
      store: createStore(),
      autoStart: false,
    });
    tour.subscribe(() => {});
    expect(tour.getSnapshot().active).toBe(false);
    tour.start();
    expect(tour.getSnapshot()).toEqual({ active: true, index: 0 });
  });

  it("stays closed when the done flag is set", () => {
    const store = createStore();
    store.setItem(onboardingTourKey("intro"), true);
    const tour = createTourController({ id: "intro", stepCount: 3, store });
    tour.subscribe(() => {});
    expect(tour.getSnapshot().active).toBe(false);
  });

  it("next and back move by one and stop at the ends", () => {
    const tour = createTourController({
      id: "intro",
      stepCount: 3,
      store: createStore(),
    });
    tour.subscribe(() => {});
    tour.back();
    expect(tour.getSnapshot().index).toBe(0);
    tour.next();
    expect(tour.getSnapshot().index).toBe(1);
    tour.next();
    expect(tour.getSnapshot().index).toBe(2);
    tour.back();
    expect(tour.getSnapshot().index).toBe(1);
  });

  it("next on the last step finishes", () => {
    const store = createStore();
    const onComplete = vi.fn();
    const tour = createTourController({
      id: "intro",
      stepCount: 2,
      store,
      onComplete,
    });
    tour.subscribe(() => {});
    tour.next();
    tour.next();
    expect(tour.getSnapshot().active).toBe(false);
    expect(store.getItem(onboardingTourKey("intro"))).toBe(true);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("finished");
  });

  it("skip and finish set the done flag and report how the tour ended", () => {
    for (const [method, reason] of [
      ["skip", "skipped"],
      ["finish", "finished"],
    ] as const) {
      const store = createStore();
      const onComplete = vi.fn();
      const tour = createTourController({
        id: "intro",
        stepCount: 3,
        store,
        onComplete,
      });
      tour.subscribe(() => {});
      tour[method]();
      expect(tour.getSnapshot().active).toBe(false);
      expect(store.getItem(onboardingTourKey("intro"))).toBe(true);
      expect(onComplete).toHaveBeenCalledExactlyOnceWith(reason);
    }
  });

  it("clearing the store key opens the tour again", () => {
    const store = createStore();
    const tour = createTourController({ id: "intro", stepCount: 3, store });
    tour.subscribe(() => {});
    tour.next();
    tour.skip();
    expect(tour.getSnapshot().active).toBe(false);
    store.removeItem(onboardingTourKey("intro"));
    expect(tour.getSnapshot()).toEqual({ active: true, index: 0 });
  });

  it("does not reopen on a cleared key when autoStart is off", () => {
    const store = createStore();
    const tour = createTourController({
      id: "intro",
      stepCount: 3,
      store,
      autoStart: false,
    });
    tour.subscribe(() => {});
    tour.start();
    tour.skip();
    store.removeItem(onboardingTourKey("intro"));
    expect(tour.getSnapshot().active).toBe(false);
  });

  it("a tour with no steps never opens", () => {
    const tour = createTourController({
      id: "intro",
      stepCount: 0,
      store: createStore(),
    });
    tour.subscribe(() => {});
    tour.start();
    expect(tour.getSnapshot()).toEqual({ active: false, index: 0 });
  });

  it("stops watching the store once the last subscriber leaves", () => {
    const store = createStore();
    const tour = createTourController({ id: "intro", stepCount: 3, store });
    const unsubscribe = tour.subscribe(() => {});
    tour.skip();
    unsubscribe();
    store.removeItem(onboardingTourKey("intro"));
    expect(tour.getSnapshot().active).toBe(false);
  });
});
