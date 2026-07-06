import { ThemeProvider } from "next-themes";
import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { SiteNav } from "@/components/site-nav";
import "./index.css";

// No-flash theme bootstrap. Runs before hydration so the prerendered (default)
// markup is corrected to the user's preference before paint. Shares the "theme"
// localStorage key with next-themes; supports light / dark / system.
const themeScript = `(() => {
  // Mark JS as active so scroll-reveal content is hidden (then animated in) only
  // when JS can reveal it again — without JS the content stays visible.
  document.documentElement.classList.add("js");
  try {
    const t = localStorage.getItem("theme") || "system";
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", t === "dark" || (t === "system" && sys));
  } catch {
    document.documentElement.classList.add("dark");
  }
})();`;

export const meta: MetaFunction = () => [
  { title: "Chelone | Zod-first admin engine for React" },
  {
    name: "description",
    content:
      "Chelone is a framework-agnostic admin engine for React — typed records and zero-boilerplate validation from your Zod schema, composed with shadcn blocks.",
  },
  { property: "og:title", content: "Chelone" },
  {
    property: "og:description",
    content:
      "A framework-agnostic admin engine for React. Point at a Zod schema, ship an admin panel.",
  },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://chelone.dev" },
];

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/chelone-favicon.svg" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, non-user-controlled no-flash theme bootstrap that must run before hydration (standard next-themes SSG pattern). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-dvh flex flex-col">
            <SiteNav />
            {children}
          </div>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
