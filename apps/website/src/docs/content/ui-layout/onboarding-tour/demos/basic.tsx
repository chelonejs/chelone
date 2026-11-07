import { OnboardingTour, type OnboardingTourHandle } from "@chelone/react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    target: "[data-tour='demo-title']",
    title: "Your posts",
    content: "Every post you write shows up here.",
  },
  {
    target: "[data-tour='demo-new']",
    title: "Write one",
    content: "Start a new post from this button.",
  },
];

/** `<OnboardingTour>` highlights each target in turn. `autoStart` is off so the tour waits for the button. */
export default function OnboardingTourDemo() {
  const tour = useRef<OnboardingTourHandle>(null);
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg" data-tour="demo-title">
          Posts
        </h3>
        <Button size="sm" data-tour="demo-new">
          New post
        </Button>
      </div>
      <Button variant="outline" onClick={() => tour.current?.start()}>
        Start the tour
      </Button>
      <OnboardingTour
        ref={tour}
        id="docs-demo"
        steps={steps}
        autoStart={false}
      />
    </div>
  );
}
