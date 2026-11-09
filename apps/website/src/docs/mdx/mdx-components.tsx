/**
 * MDX component map — referenced by vite.config.ts `providerImportSource`.
 *
 * @mdx-js/rollup expects this module to export `useMDXComponents`
 * (the standard MDX provider contract).
 */
import type { MDXComponents } from "mdx/types";
import { Link } from "react-router";
import { Callout } from "./callout";
import { Card, Cards } from "./cards";
import { ComponentPreview } from "./component-preview";
import { FrameworkCode } from "./framework-code";
import { HeadingLink } from "./heading-link";
import { PropsTable } from "./props-table";
import { TabItem, Tabs } from "./tabs";

// ── Link shim: internal → react-router Link, external → <a> ────────────────

function MdxLink({
  href,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<"a"> & { href?: string }) {
  const url = href ?? "";
  const isInternal = url.startsWith("/") || url.startsWith("#");
  if (isInternal) {
    return (
      <Link to={url} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

// ── Image shim ───────────────────────────────────────────────────────────────

function MdxImg({ src, alt, ...rest }: React.ComponentPropsWithoutRef<"img">) {
  // TODO(screenshots): the migrated docs reference ~124 marmelab images under
  // /docs/images/* (UI screenshots + backend/auth logos) that we don't ship.
  // Suppress them site-wide until we regenerate our own from apps/demo. The
  // refs stay in the MDX (grep "/docs/images/") so each is findable later;
  // drop this guard once the real images live in public/docs/images/.
  // See memory: project_docs_images_pending.
  if (typeof src === "string" && src.startsWith("/docs/images/")) {
    return null;
  }
  return (
    <img
      src={src}
      alt={alt ?? ""}
      className="my-4 max-w-full rounded-lg border"
      loading="lazy"
      {...rest}
    />
  );
}

// ── Code: chip only for INLINE code ─────────────────────────────────────────

function MdxCode({
  children,
  ...rest
}: React.ComponentPropsWithoutRef<"code">) {
  // rehype-pretty-code block code (inside <pre>) carries data-language; the
  // <pre> + shiki tokens already style it. Only inline code gets the chip —
  // applying the chip's bg/radius/smaller-text to a multi-line block mangles it.
  const isBlock = "data-language" in rest;
  if (isBlock) {
    return <code {...rest}>{children}</code>;
  }
  return (
    <code
      className="font-mono text-[0.875em] bg-muted/60 rounded px-1.5 py-0.5"
      {...rest}
    >
      {children}
    </code>
  );
}

// ── Headings: h2/h3 link to themselves (the "On this page" rail's entries) ──

function MdxH2({ id, children }: React.ComponentPropsWithoutRef<"h2">) {
  return (
    <HeadingLink level={2} id={id}>
      {children}
    </HeadingLink>
  );
}

function MdxH3({ id, children }: React.ComponentPropsWithoutRef<"h3">) {
  return (
    <HeadingLink level={3} id={id}>
      {children}
    </HeadingLink>
  );
}

// ── Component map ────────────────────────────────────────────────────────────

const components: MDXComponents = {
  // HTML overrides
  a: MdxLink,
  img: MdxImg,
  code: MdxCode,
  h2: MdxH2,
  h3: MdxH3,
  // Starlight-compat global components
  Tabs,
  TabItem,
  Callout,
  Cards,
  Card,
  ComponentPreview,
  FrameworkCode,
  PropsTable,
};

/**
 * Required by @mdx-js/rollup `providerImportSource` contract.
 * Downstream MDX files call `useMDXComponents()` to get the map.
 */
export function useMDXComponents(inherited: MDXComponents = {}): MDXComponents {
  return { ...inherited, ...components };
}
