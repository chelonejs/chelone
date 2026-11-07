// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import sections from "../src/docs/content/_meta";
import pageComponentsMeta from "../src/docs/content/page-components/_meta";
import supabaseMeta from "../src/docs/content/supabase/_meta";
import { SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

/**
 * A reference page for an add-on piece: its slug, the section folder it lives
 * in, the component it documents, its registry item, the entry that exports it,
 * the guide it links back to, the backticked names the page must carry, and the
 * names it may backtick that are not props of the component.
 */
interface ReferencePage {
  slug: string;
  section: string;
  component: string;
  registry: string;
  importFrom: string;
  guide: string;
  names: string[];
  notProps: string[];
}

/**
 * The four pieces of the `supabase` entry a page can hold a props table for.
 * The forms, the sixteen provider buttons and the three hooks stay in the
 * guide: a provider button is `SocialAuthButton` with `provider` set for the
 * caller, and a hook takes no props.
 */
const supabasePages: ReferencePage[] = [
  {
    slug: "supabase-login-page",
    section: "supabase",
    component: "SupabaseLoginPage",
    registry: "supabase-login-page",
    importFrom: "@chelone/react/supabase",
    guide: "/docs/app-config/supabase-pages",
    names: [
      "providers",
      "disableEmailPassword",
      "disableForgotPassword",
      "redirectTo",
      "path",
    ],
    notProps: ["path"],
  },
  {
    slug: "forgot-password-page",
    section: "supabase",
    component: "ForgotPasswordPage",
    registry: "forgot-password-page",
    importFrom: "@chelone/react/supabase",
    guide: "/docs/app-config/supabase-pages",
    names: ["children", "path"],
    notProps: ["path", "resetPassword"],
  },
  {
    slug: "set-password-page",
    section: "supabase",
    component: "SetPasswordPage",
    registry: "set-password-page",
    importFrom: "@chelone/react/supabase",
    guide: "/docs/app-config/supabase-pages",
    names: ["children", "path"],
    notProps: ["path", "setPassword"],
  },
  {
    slug: "social-auth-button",
    section: "supabase",
    component: "SocialAuthButton",
    registry: "social-auth-button",
    importFrom: "@chelone/react/supabase",
    guide: "/docs/app-config/supabase-pages",
    names: ["provider", "redirect", "children"],
    notProps: ["login", "signInWithOAuth"],
  },
];

/**
 * The `csv-import` entry's component. It sits under Page Components because it
 * is a piece you put inside a `<List>`, and its guide is that section's Data
 * Import page. `useCsvImport` is the hook a child of it calls, and `papaparse`
 * the optional peer its add-on imports.
 */
const csvImportPage: ReferencePage = {
  slug: "csv-import",
  section: "page-components",
  component: "CsvImport",
  registry: "csv-import",
  importFrom: "@chelone/react/csv-import",
  guide: "/docs/page-components/list/data-import",
  names: [
    "schema",
    "fields",
    "requiredFields",
    "mapping",
    "transform",
    "batchSize",
    "resource",
  ],
  notProps: ["create", "papaparse", "useCsvImport"],
};

const referencePages: ReferencePage[] = [...supabasePages, csvImportPage];

const pageUrl = (reference: ReferencePage) =>
  new URL(
    `../src/docs/content/${reference.section}/${reference.slug}/index.mdx`,
    import.meta.url,
  );

const pageOf = (reference: ReferencePage) =>
  readFileSync(pageUrl(reference), "utf8");

const guideOf = (slug: string) =>
  readFileSync(
    new URL(`../src/docs/content/${slug}.mdx`, import.meta.url),
    "utf8",
  );

const stubLines = readFileSync(
  new URL("./gen-component-stubs.mjs", import.meta.url),
  "utf8",
).split("\n");

it("Supabase has an icon and blurb for section navigation and cards", () => {
  expect(SECTION_META.supabase?.icon).toBeDefined();
  expect(SECTION_META.supabase?.blurb).toMatch(/\S/);
});

it("Supabase follows Maps and lists every Supabase reference page", () => {
  const dirs = sections.map((section) => section.dir);
  const mapsIndex = dirs.indexOf("maps");
  expect(dirs.slice(mapsIndex, mapsIndex + 2)).toEqual(["maps", "supabase"]);
  expect(
    supabaseMeta.flatMap((entry) => ("slugs" in entry ? entry.slugs : [])),
  ).toEqual(supabasePages.map(({ slug }) => slug));
});

it("Page Components lists CsvImport after the list pages", () => {
  expect(
    pageComponentsMeta.map((entry) =>
      "dir" in entry ? `dir:${entry.dir}` : `slug:${entry.slug}`,
    ),
  ).toEqual([
    "dir:list",
    "slug:csv-import",
    "dir:edit",
    "slug:create",
    "slug:show",
    "slug:list-guesser",
    "slug:show-guesser",
    "slug:edit-guesser",
  ]);
});

it.each(referencePages)(
  "$component has a page at $section/$slug",
  (reference) => {
    expect(existsSync(pageUrl(reference)), `${reference.slug}/index.mdx`).toBe(
      true,
    );
  },
);

it.each(referencePages)(
  "$component has a row in the stub table importing from $importFrom",
  ({ component, section, importFrom, registry }) => {
    const line = stubLines.find((row) =>
      row.includes(`component: "${component}"`),
    );
    expect(line, `${component} in STUBS`).toBeDefined();
    expect(line).toContain(`section: "${section}"`);
    expect(line).toContain(`registry: "${registry}"`);
    expect(line).toContain(`importFrom: "${importFrom}"`);
  },
);

it.each(referencePages)(
  "$component has a generated reference page with its props, import and a link to its guide",
  (reference) => {
    const mdx = pageOf(reference);

    expect(mdx).toContain(`title: "${reference.component}"`);
    expect(mdx).toContain(`registry: "${reference.registry}"`);
    expect(mdx).toContain("{/* generated:gen-component-stubs */}");
    for (const name of reference.names) {
      expect(mdx, `${reference.slug} names \`${name}\``).toContain(
        `\`${name}\``,
      );
    }
    expect(mdx).toContain(`<PropsTable name="${reference.component}" />`);
    expect(mdx).toContain(
      `import { ${reference.component} } from "${reference.importFrom}";`,
    );
    expect(mdx).toContain(`](${reference.guide})`);
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);

/** The prop names a page's props table renders, from the typedoc JSON. */
function propNames(component: string): Set<string> {
  const json: { props?: { name: string }[] } = JSON.parse(
    readFileSync(
      new URL(`../src/docs/content/props/${component}.json`, import.meta.url),
      "utf8",
    ),
  );
  return new Set((json.props ?? []).map((prop) => prop.name));
}

// Elements a page names as what a component renders, never as props.
const HTML_ELEMENTS = new Set(["div"]);

it.each(referencePages)(
  "$component backticks only its own props, so no page suggests a prop that does not exist",
  (reference) => {
    const props = propNames(reference.component);
    const own = new Set(reference.notProps);
    for (const match of pageOf(reference).matchAll(/`([a-z][\w.-]*)`/g)) {
      const root = match[1].split(".")[0];
      expect(
        props.has(root) || own.has(root) || HTML_ELEMENTS.has(root),
        `${reference.slug}: \`${match[1]}\` is not a prop of ${reference.component}`,
      ).toBe(true);
    }
  },
);

it.each(referencePages)(
  "$component is exported by the $importFrom entry of both adapters",
  ({ component, importFrom }) => {
    // `@chelone/react/csv-import` is exported by `src/csv-import.ts`.
    const entry = importFrom.split("/").slice(2).join("-");
    for (const adapter of ["react", "vue"]) {
      const source = readFileSync(
        new URL(
          `../../../packages/${adapter}/src/${entry}.ts`,
          import.meta.url,
        ),
        "utf8",
      );
      expect(source, `${component} in @chelone/${adapter}/${entry}`).toContain(
        component,
      );
    }
  },
);

it.each(["app-config/supabase-pages", "page-components/list/data-import"])(
  "%s stays a hand-written guide with no broken link",
  (slug) => {
    const mdx = guideOf(slug);
    expect(mdx).not.toContain("{/* generated:gen-component-stubs */}");
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);
