import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { CheloneStore } from "../store/store";

/** Where the onboarding tour keeps its done flag in a `CheloneStore`. */
export function onboardingTourKey(id: string): string {
  return `onboarding-tour.${id}.completed`;
}

export interface TourState {
  active: boolean;
  index: number;
}

export type TourEnd = "finished" | "skipped";

export interface TourControllerOptions {
  id: string;
  stepCount: number;
  store: CheloneStore;
  /** Open on the first subscribe while the done flag is not `true`. */
  autoStart?: boolean;
  onComplete?: (reason: TourEnd) => void;
}

export interface TourController extends MicroStore<TourState> {
  start(): void;
  next(): void;
  back(): void;
  skip(): void;
  finish(): void;
}

export function createTourController({
  id,
  stepCount,
  store,
  autoStart = true,
  onComplete,
}: TourControllerOptions): TourController {
  const key = onboardingTourKey(id);
  const isDone = () => store.getItem<boolean>(key) === true;

  const micro = createMicroStore<TourState>(
    { active: false, index: 0 },
    {
      // The store is only watched while someone is subscribed, so an unmounted
      // tour does not reopen when its flag is cleared.
      onSubscribed() {
        const openIfDue = () => {
          if (autoStart && !isDone() && !micro.getSnapshot().active) start();
        };
        openIfDue();
        return store.subscribe(key, openIfDue);
      },
    },
  );

  function start(): void {
    if (stepCount < 1) return;
    micro.setState({ active: true, index: 0 });
  }

  function end(reason: TourEnd): void {
    if (!micro.getSnapshot().active) return;
    micro.setState({ active: false });
    store.setItem(key, true);
    onComplete?.(reason);
  }

  return {
    ...micro,
    start,
    next() {
      const { active, index } = micro.getSnapshot();
      if (!active) return;
      if (index >= stepCount - 1) end("finished");
      else micro.setState({ index: index + 1 });
    },
    back() {
      const { active, index } = micro.getSnapshot();
      if (active && index > 0) micro.setState({ index: index - 1 });
    },
    skip: () => end("skipped"),
    finish: () => end("finished"),
  };
}
