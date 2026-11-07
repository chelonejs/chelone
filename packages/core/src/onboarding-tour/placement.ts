/** How often an open tour re-measures its target and card, in milliseconds. */
export const REMEASURE_MS = 250;

/** A box in viewport pixels. The adapters measure it; core touches no DOM. */
export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

type Side = Exclude<TourPlacement, "auto">;

export interface PlaceTourCardOptions {
  /** `null` centres the card, for a step that points at nothing. */
  target: TourRect | null;
  card: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: TourPlacement;
  /** Gap between card and target, and the least distance to a viewport edge. */
  margin?: number;
}

export interface TourCardPosition {
  /** The card's top-left corner. */
  top: number;
  left: number;
  side: Side;
}

// Tie order for `auto`.
const SIDES: readonly Side[] = ["bottom", "top", "right", "left"];
const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

export function placeTourCard({
  target,
  card,
  viewport,
  placement,
  margin = 12,
}: PlaceTourCardOptions): TourCardPosition {
  if (!target) {
    return {
      top: (viewport.height - card.height) / 2,
      left: (viewport.width - card.width) / 2,
      side: placement === "auto" ? "bottom" : placement,
    };
  }

  const room: Record<Side, number> = {
    top: target.top,
    bottom: viewport.height - (target.top + target.height),
    left: target.left,
    right: viewport.width - (target.left + target.width),
  };
  const needed = (side: Side): number =>
    (side === "top" || side === "bottom" ? card.height : card.width) +
    margin * 2;
  const fits = (side: Side): boolean => room[side] >= needed(side);

  let side: Side;
  if (placement === "auto") {
    // Prefer sides the card fits on, so a roomy but too-small side cannot win
    // and push the card over the target.
    const roomiest = (candidates: readonly Side[]): Side =>
      candidates.reduce((best, next) =>
        room[next] > room[best] ? next : best,
      );
    const fitting = SIDES.filter(fits);
    side = roomiest(fitting.length > 0 ? fitting : SIDES);
  } else {
    side =
      !fits(placement) && fits(OPPOSITE[placement])
        ? OPPOSITE[placement]
        : placement;
  }

  const centreX = target.left + target.width / 2 - card.width / 2;
  const centreY = target.top + target.height / 2 - card.height / 2;
  let top: number;
  let left: number;
  switch (side) {
    case "bottom":
      top = target.top + target.height + margin;
      left = centreX;
      break;
    case "top":
      top = target.top - margin - card.height;
      left = centreX;
      break;
    case "right":
      top = centreY;
      left = target.left + target.width + margin;
      break;
    case "left":
      top = centreY;
      left = target.left - margin - card.width;
      break;
  }

  // max last: a card larger than the viewport pins to the top-left margin.
  return {
    top: Math.max(
      margin,
      Math.min(top, viewport.height - card.height - margin),
    ),
    left: Math.max(
      margin,
      Math.min(left, viewport.width - card.width - margin),
    ),
    side,
  };
}

/** A CSS `clip-path` that fills the page except the target's rect. */
export function tourSpotlightPath(target: TourRect): string {
  const right = target.left + target.width;
  const bottom = target.top + target.height;
  return `polygon(0% 0%, 0% 100%, ${target.left}px 100%, ${target.left}px ${target.top}px, ${right}px ${target.top}px, ${right}px ${bottom}px, ${target.left}px ${bottom}px, ${target.left}px 100%, 100% 100%, 100% 0%)`;
}
