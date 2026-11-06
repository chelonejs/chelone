import { IconButtonWithTooltip } from "@chelone/react";
import { Info } from "lucide-react";

/** `<IconButtonWithTooltip>` shows an information icon with an explanatory tooltip. */
export default function IconButtonWithTooltipDemo() {
  return (
    <IconButtonWithTooltip label="Posts are stored in memory">
      <Info />
    </IconButtonWithTooltip>
  );
}
