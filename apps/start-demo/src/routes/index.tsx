/**
 * `/` — the demo has no landing page of its own: the admin is the app, so home
 * is the first resource. A sign-in whose `?redirect=` was off-site lands here.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/posts", replace: true });
  },
});
