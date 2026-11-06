import { PrevNextButtons } from "@chelone/react";

export const mode = "record";

/** `<PrevNextButtons>` shows a post's position and links to its neighbours. */
export default function PrevNextButtonsDemo() {
  return <PrevNextButtons linkType="show" />;
}
