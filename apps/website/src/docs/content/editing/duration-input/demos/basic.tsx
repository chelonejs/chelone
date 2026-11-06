import { DurationInput } from "@chelone/react";

export const mode = "input";

/** `<DurationInput>` splits `P1DT2H30M` across day, hour, minute and second boxes. */
export default function DurationInputDemo() {
  return <DurationInput source="duration" defaultValue="P1DT2H30M" />;
}
