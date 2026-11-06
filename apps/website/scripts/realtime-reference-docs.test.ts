// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import sections from "../src/docs/content/_meta";
import realtimeMeta from "../src/docs/content/realtime/_meta";
import { SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

const components = [
  { slug: "list-live", component: "ListLive" },
  { slug: "edit-live", component: "EditLive" },
  { slug: "show-live", component: "ShowLive" },
  { slug: "menu-live", component: "MenuLive" },
  { slug: "presence-bar", component: "PresenceBar" },
  { slug: "comments-thread", component: "CommentsThread" },
  { slug: "lock-on-mount", component: "LockOnMount" },
  { slug: "lock-status", component: "LockStatus" },
];

// Hooks ship no props JSON, so each page is hand-written: signature, returns, one example.
const hooks = [
  { slug: "use-subscribe", hook: "useSubscribe" },
  { slug: "use-subscribe-to-record", hook: "useSubscribeToRecord" },
  { slug: "use-subscribe-to-record-list", hook: "useSubscribeToRecordList" },
  { slug: "use-subscribe-callback", hook: "useSubscribeCallback" },
  { slug: "use-publish", hook: "usePublish" },
  { slug: "use-on-reconnect", hook: "useOnReconnect" },
  { slug: "use-realtime-status", hook: "useRealtimeStatus" },
  { slug: "use-get-list-live", hook: "useGetListLive" },
  { slug: "use-get-one-live", hook: "useGetOneLive" },
  { slug: "use-get-many-live", hook: "useGetManyLive" },
  { slug: "use-lock", hook: "useLock" },
  { slug: "use-unlock", hook: "useUnlock" },
  { slug: "use-get-lock", hook: "useGetLock" },
  { slug: "use-get-lock-live", hook: "useGetLockLive" },
  { slug: "use-get-locks", hook: "useGetLocks" },
  { slug: "use-get-locks-live", hook: "useGetLocksLive" },
  { slug: "use-lock-on-mount", hook: "useLockOnMount" },
];

const page = (slug: string) =>
  readFileSync(
    new URL(`../src/docs/content/realtime/${slug}/index.mdx`, import.meta.url),
    "utf8",
  );

it("Realtime has an icon and blurb for section navigation and cards", () => {
  expect(SECTION_META.realtime?.icon).toBeDefined();
  expect(SECTION_META.realtime?.blurb).toMatch(/\S/);
});

it("Realtime follows UI & Layout and lists every realtime page", () => {
  const directories = sections.map((section) => section.dir);
  const uiLayoutIndex = directories.indexOf("ui-layout");
  expect(directories.slice(uiLayoutIndex, uiLayoutIndex + 2)).toEqual([
    "ui-layout",
    "realtime",
  ]);
  const slugs = realtimeMeta.flatMap((entry) => entry.slugs);
  expect(slugs).toEqual([
    ...components.map(({ slug }) => slug),
    ...hooks.map(({ slug }) => slug),
  ]);
});

it.each(components)(
  "$component has a reference page with its props and a working link to the realtime guide",
  ({ slug, component }) => {
    const mdx = page(slug);

    expect(mdx).toContain(`title: "${component}"`);
    expect(mdx).toContain(`<PropsTable name="${component}" />`);
    expect(mdx).toContain("(/docs/app-config/realtime)");
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);

it.each(hooks)(
  "$hook has a reference page with its signature, returns and a working link to the realtime guide",
  ({ slug, hook }) => {
    const mdx = page(slug);

    expect(mdx).toContain(`title: "${hook}"`);
    expect(mdx).toContain("## Signature");
    expect(mdx).toContain("## Returns");
    expect(mdx).toContain(`${hook}(`);
    // A hook has no props JSON, so a props table would render nothing.
    expect(mdx).not.toContain("<PropsTable");
    expect(mdx).toContain("(/docs/app-config/realtime)");
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);

it("the useLockOnMount page tells a held record from a failed release", () => {
  const mdx = page("use-lock-on-mount");
  expect(mdx).toContain("LockConflictError");
  expect(mdx, "a failed release reaches onLockError, not lockError").toMatch(
    /failed release[\s\S]{0,160}onLockError/,
  );
});

it("the useSubscribeToRecord page pins the waiting rule and id 0", () => {
  const mdx = page("use-subscribe-to-record");
  expect(mdx, "a null or undefined id subscribes to nothing").toMatch(
    /null[^\n]*undefined[\s\S]{0,160}subscribes to nothing/,
  );
  expect(mdx, "0 is an id, not an absent one").toContain("`0` is an id");
});

it("the useRealtimeStatus page pins idle and the clearing of lastError", () => {
  const mdx = page("use-realtime-status");
  expect(mdx, "a transport that reports neither reads as idle").toMatch(
    /reports neither[\s\S]{0,120}"idle"|"idle"[\s\S]{0,120}reports neither/,
  );
  expect(
    mdx,
    "a connected status clears the error the transport last reported",
  ).toMatch(
    /lastError[\s\S]{0,240}\bconnected\b|\bconnected\b[\s\S]{0,240}lastError/,
  );
});

it("the useOnReconnect page says a transport that cannot say is left alone", () => {
  const mdx = page("use-on-reconnect");
  expect(mdx).toMatch(
    /does nothing[\s\S]{0,160}onReconnect|onReconnect[\s\S]{0,160}does nothing/,
  );
});

it("the usePublish page names the event without its topic", () => {
  expect(page("use-publish")).toContain('Omit<RealtimeEvent, "topic">');
});

it("every hook with a page is exported by both adapters", () => {
  for (const adapter of ["react", "vue"]) {
    const barrel = readFileSync(
      new URL(`../../../packages/${adapter}/src/index.ts`, import.meta.url),
      "utf8",
    );
    for (const { hook } of hooks) {
      expect(barrel, `${hook} in @chelone/${adapter}`).toMatch(
        new RegExp(`\\b${hook}\\b`),
      );
    }
  }
});
