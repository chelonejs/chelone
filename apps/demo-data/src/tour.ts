import type { TourPlacement } from "@chelone/core";

/** The tour's name in the store: finishing it stores `onboarding-tour.welcome.completed`. */
export const TOUR_ID = "welcome";

export interface DemoTourStep {
  /** Each target is an element of the app shell, so every page has it. */
  target: string;
  title: string;
  content: string;
  placement?: TourPlacement;
}

export const tourSteps: DemoTourStep[] = [
  {
    target: "[data-tour='search']",
    title: "Find anything",
    content:
      "Press Cmd+K or Ctrl+K, or click here, to jump to a resource or a record.",
    placement: "bottom",
  },
  {
    target: "[data-tour='configure']",
    title: "Make it yours",
    content:
      "Configure mode outlines what you can customize. Open a post, switch it on and hide the inputs you never fill.",
    placement: "bottom",
  },
  {
    target: "[data-slot='data-provider-devtools']",
    title: "See every call",
    content:
      "This panel lists the calls the data provider made, with their params and results.",
    placement: "top",
  },
  {
    target: "[data-slot='assistant-trigger']",
    title: "Ask the assistant",
    content: "Try: How many published posts are there?",
    placement: "top",
  },
];
