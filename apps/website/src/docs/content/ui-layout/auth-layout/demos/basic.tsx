import { AuthLayout } from "@chelone/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** `<AuthLayout>` centres a static sign-in form beneath a welcome heading. */
export default function AuthLayoutDemo() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account."
      className="min-h-0 w-full py-6"
    >
      <fieldset
        disabled
        aria-label="Sign-in form preview"
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="preview-login-email">Email</Label>
          <Input
            id="preview-login-email"
            type="email"
            placeholder="ada@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-login-password">Password</Label>
          <Input id="preview-login-password" type="password" />
        </div>
        <Button className="w-full" type="button">
          Sign in
        </Button>
      </fieldset>
    </AuthLayout>
  );
}
