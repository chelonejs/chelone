import { CheckForApplicationUpdate } from "@chelone/react";

/** `<CheckForApplicationUpdate>` stays silent in this static, up-to-date state. */
export default function CheckForApplicationUpdateDemo() {
  return (
    <>
      <CheckForApplicationUpdate disabled />
      <p className="text-sm text-muted-foreground">
        The application is up to date.
      </p>
    </>
  );
}
