/**
 * `<OnboardingTour>` — highlights one element per step with a card beside it,
 * and remembers in the store that the tour is done. Ported from shadmin
 * `widgets/onboarding-tour.tsx`; the state machine and the geometry come from
 * `@chelone/core`, this file measures and renders.
 */

import {
  createTourController,
  placeTourCard,
  type TourEnd,
  type TourPlacement,
  type TourRect,
  tourSpotlightPath,
} from "@chelone/core";
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCheloneStore } from "../../../context";
import { useTranslate } from "../../../i18n-hooks";

export interface TourStep {
  /** CSS selector of the element to highlight. A step whose element is missing shows a centred card. */
  target: string;
  title?: ReactNode;
  content: ReactNode;
  /** Overrides the tour's `placement` for this step. */
  placement?: TourPlacement;
}

export interface OnboardingTourProps {
  /** Names the tour in the store: finishing or skipping it stores `onboarding-tour.<id>.completed`. */
  id: string;
  steps: TourStep[];
  /** Open on mount while the tour is not stored as done. Default `true`. */
  autoStart?: boolean;
  onComplete?: (reason: TourEnd) => void;
  /** Where the card sits relative to its target. Default `"auto"`. */
  placement?: TourPlacement;
}

const REMEASURE_MS = 250;

function findTarget(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    // An invalid selector throws a SyntaxError: count it as a missing target.
    return null;
  }
}

function measure(element: Element | null): TourRect | null {
  if (!element) return null;
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}

function sameRect(a: TourRect | null, b: TourRect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Mount once, anywhere under `<Admin>`.
 *
 * @example
 * <OnboardingTour
 *   id="welcome"
 *   steps={[{ target: "#new-post", title: "Create", content: "Start here." }]}
 * />
 */
export function OnboardingTour({
  id,
  steps,
  autoStart = true,
  onComplete,
  placement = "auto",
}: OnboardingTourProps) {
  const store = useCheloneStore();
  const stepCount = steps.length;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const controller = useMemo(
    () =>
      createTourController({
        id,
        stepCount,
        store,
        autoStart,
        onComplete: (reason) => onCompleteRef.current?.(reason),
      }),
    [id, stepCount, store, autoStart],
  );
  const { active, index } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  const step = steps[index];
  if (!active || !step || typeof document === "undefined") return null;

  return createPortal(
    <TourOverlay
      key={id}
      controller={controller}
      step={step}
      index={index}
      total={stepCount}
      placement={step.placement ?? placement}
    />,
    document.body,
  );
}

interface TourOverlayProps {
  controller: ReturnType<typeof createTourController>;
  step: TourStep;
  index: number;
  total: number;
  placement: TourPlacement;
}

function TourOverlay({
  controller,
  step,
  index,
  total,
  placement,
}: TourOverlayProps) {
  const translate = useTranslate();
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const isLast = index === total - 1;

  // The element that had focus gets it back when the tour closes.
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const remeasure = () => {
      const next = measure(findTarget(step.target));
      setRect((current) => (sameRect(current, next) ? current : next));
    };
    findTarget(step.target)?.scrollIntoView({ block: "center" });
    remeasure();
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    const timer = window.setInterval(remeasure, REMEASURE_MS);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
      window.clearInterval(timer);
    };
  }, [step.target]);

  // `index` re-runs this for a step that shares its predecessor's target.
  // biome-ignore lint/correctness/useExhaustiveDependencies(index): focus follows the step, not any value read inside.
  useEffect(() => {
    advanceRef.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") controller.skip();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [controller]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    setCardSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  });

  const position = placeTourCard({
    target: rect,
    card: cardSize,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    placement,
  });

  return (
    <div data-slot="onboarding-tour">
      <div
        data-slot="tour-scrim"
        aria-hidden="true"
        className="fixed inset-0 z-[100] bg-black/50"
        style={rect ? { clipPath: tourSpotlightPath(rect) } : undefined}
        onClick={controller.skip}
      />
      {rect ? (
        <div
          data-slot="tour-ring"
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] rounded-md ring-2 ring-primary"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}
      <div
        ref={cardRef}
        data-slot="tour-card"
        data-side={position.side}
        role="dialog"
        aria-modal="true"
        aria-labelledby={step.title ? titleId : undefined}
        className={cn(
          "fixed z-[101] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg",
        )}
        style={{ top: position.top, left: position.left }}
      >
        {step.title ? (
          <h2 id={titleId} className="mb-1 text-sm font-semibold">
            {step.title}
          </h2>
        ) : null}
        <div className="text-sm text-muted-foreground">{step.content}</div>
        <div className="mt-4 flex items-center gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            {index + 1} / {total}
          </span>
          <Button variant="ghost" size="sm" onClick={controller.skip}>
            {translate("chelone.onboarding_tour.skip", { _: "Skip" })}
          </Button>
          {index > 0 ? (
            <Button variant="outline" size="sm" onClick={controller.back}>
              {translate("chelone.onboarding_tour.back", { _: "Back" })}
            </Button>
          ) : null}
          <Button ref={advanceRef} size="sm" onClick={controller.next}>
            {isLast
              ? translate("chelone.onboarding_tour.finish", { _: "Finish" })
              : translate("chelone.onboarding_tour.next", { _: "Next" })}
          </Button>
        </div>
      </div>
    </div>
  );
}
