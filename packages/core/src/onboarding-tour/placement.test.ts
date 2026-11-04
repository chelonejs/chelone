import { describe, expect, it } from "vitest";
import { placeTourCard, type TourRect, tourSpotlightPath } from "./placement";

const viewport = { width: 1000, height: 800 };
const card = { width: 200, height: 100 };
const target: TourRect = { top: 300, left: 400, width: 100, height: 50 };

describe("placeTourCard", () => {
  it("places the card on each named side of the target", () => {
    const place = (placement: "top" | "bottom" | "left" | "right") =>
      placeTourCard({ target, card, viewport, placement });
    expect(place("bottom")).toEqual({ top: 362, left: 350, side: "bottom" });
    expect(place("top")).toEqual({ top: 188, left: 350, side: "top" });
    expect(place("right")).toEqual({ top: 275, left: 512, side: "right" });
    expect(place("left")).toEqual({ top: 275, left: 188, side: "left" });
  });

  it("uses the margin as the gap to the target", () => {
    expect(
      placeTourCard({
        target,
        card,
        viewport,
        placement: "bottom",
        margin: 20,
      }),
    ).toEqual({ top: 370, left: 350, side: "bottom" });
  });

  it("auto picks the side with the most room", () => {
    const auto = (t: TourRect) =>
      placeTourCard({ target: t, card, viewport, placement: "auto" }).side;
    expect(auto({ top: 20, left: 400, width: 100, height: 50 })).toBe("bottom");
    expect(auto({ top: 700, left: 400, width: 100, height: 50 })).toBe("top");
    expect(auto({ top: 0, left: 0, width: 100, height: 800 })).toBe("right");
    expect(auto({ top: 0, left: 900, width: 100, height: 800 })).toBe("left");
  });

  it("auto breaks a tie in the order bottom, top, right, left", () => {
    const auto = (t: TourRect) =>
      placeTourCard({ target: t, card, viewport, placement: "auto" }).side;
    // bottom and top both have 350, right and left have 0
    expect(auto({ top: 350, left: 0, width: 1000, height: 100 })).toBe(
      "bottom",
    );
    // right and left both have 450, bottom and top have 0
    expect(auto({ top: 0, left: 450, width: 100, height: 800 })).toBe("right");
    // bottom and top 350, right and left 450: right wins on room
    expect(auto({ top: 350, left: 450, width: 100, height: 100 })).toBe(
      "right",
    );
  });

  it("flips a side that does not fit", () => {
    const nearTop: TourRect = { top: 50, left: 400, width: 100, height: 50 };
    expect(
      placeTourCard({ target: nearTop, card, viewport, placement: "top" }),
    ).toEqual({ top: 112, left: 350, side: "bottom" });
  });

  it("keeps the requested side when neither it nor its opposite fits", () => {
    const tight = { width: 1000, height: 150 };
    const result = placeTourCard({
      target: { top: 50, left: 400, width: 100, height: 50 },
      card,
      viewport: tight,
      placement: "top",
    });
    expect(result.side).toBe("top");
    expect(result.top).toBe(12);
  });

  it("keeps the card inside the viewport near an edge", () => {
    const nearLeft = placeTourCard({
      target: { top: 300, left: 0, width: 20, height: 50 },
      card,
      viewport,
      placement: "bottom",
    });
    expect(nearLeft.left).toBe(12);
    const nearRight = placeTourCard({
      target: { top: 300, left: 980, width: 20, height: 50 },
      card,
      viewport,
      placement: "bottom",
    });
    expect(nearRight.left).toBe(788);
    const nearTopEdge = placeTourCard({
      target: { top: 0, left: 900, width: 100, height: 20 },
      card,
      viewport,
      placement: "left",
    });
    expect(nearTopEdge.top).toBe(12);
  });

  it("centres the card when there is no target", () => {
    expect(
      placeTourCard({ target: null, card, viewport, placement: "auto" }),
    ).toEqual({ top: 350, left: 400, side: "bottom" });
    expect(
      placeTourCard({ target: null, card, viewport, placement: "left" }),
    ).toEqual({ top: 350, left: 400, side: "left" });
  });
});

describe("tourSpotlightPath", () => {
  it("cuts the target rect out of the full page", () => {
    expect(tourSpotlightPath(target)).toBe(
      "polygon(0% 0%, 0% 100%, 400px 100%, 400px 300px, 500px 300px, 500px 350px, 400px 350px, 400px 100%, 100% 100%, 100% 0%)",
    );
  });
});
