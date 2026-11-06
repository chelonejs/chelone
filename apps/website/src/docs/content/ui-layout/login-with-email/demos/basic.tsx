import { LoginWithEmail } from "@chelone/react";
import { useState } from "react";

/** `<LoginWithEmail>` collects an email and a password and hands them to your own `onSubmit`, so a custom backend signs the user in. */
export default function LoginWithEmailDemo() {
  const [signedInAs, setSignedInAs] = useState<string | undefined>();
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <LoginWithEmail
        submitLabel="Sign in through onSubmit"
        onSubmit={({ email }) => setSignedInAs(email)}
      />
      <p className="text-sm text-muted-foreground">
        {signedInAs
          ? `onSubmit ran for ${signedInAs}`
          : "onSubmit has not run yet."}
      </p>
    </div>
  );
}
