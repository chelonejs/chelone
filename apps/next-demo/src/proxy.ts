/**
 * Next 16's `middleware`: runs before any `/admin` page, layout or prefetch, so
 * a logged-out visit never renders one. It stays here and not in the admin
 * layout because a layout does not re-run on a client navigation between its
 * pages.
 */

import { checkRouteAuth } from "@chelone/core";
import { QueryClient } from "@tanstack/query-core";
import { type NextRequest, NextResponse } from "next/server";
import { requestAuthProvider } from "./auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const result = await checkRouteAuth(
    new QueryClient(),
    requestAuthProvider(request.cookies),
    { location: pathname + search },
  );
  if (result.authenticated || result.redirectTo === null) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(result.redirectTo, request.url));
}

export const config = { matcher: "/admin/:path*" };
