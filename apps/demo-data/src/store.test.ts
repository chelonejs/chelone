import { onboardingTourKey } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeDemoStore } from "./store";
import { TOUR_ID } from "./tour";

afterEach(() => vi.unstubAllGlobals());

describe("the demo store", () => {
  it("leaves the tour to open for a person", () => {
    vi.stubGlobal("navigator", { webdriver: false });

    expect(makeDemoStore().getItem(onboardingTourKey(TOUR_ID))).toBeUndefined();
  });

  it("marks the tour done for a browser under automation, so its scrim covers no screenshot", () => {
    vi.stubGlobal("navigator", { webdriver: true });

    expect(makeDemoStore().getItem(onboardingTourKey(TOUR_ID))).toBe(true);
  });
});
