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

// Provider builders, transports and lock providers live in @chelone/core, so
// both adapters call them the same way and no page has an "In Vue" section.
const coreFunctions = [
  { slug: "add-events-for-mutations", fn: "addEventsForMutations" },
  { slug: "memory-transport", fn: "memoryTransport" },
  { slug: "broadcast-channel-transport", fn: "broadcastChannelTransport" },
  { slug: "websocket-transport", fn: "webSocketTransport" },
  { slug: "sse-transport", fn: "sseTransport" },
  { slug: "in-memory-lock-provider", fn: "inMemoryLockProvider" },
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
    ...coreFunctions.map(({ slug }) => slug),
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

it.each(coreFunctions)(
  "$fn has a reference page with its options, returns and a working link to the realtime guide",
  ({ slug, fn }) => {
    const mdx = page(slug);

    expect(mdx).toContain(`title: "${fn}"`);
    expect(mdx).toContain("## Signature");
    expect(mdx).toContain("## Returns");
    expect(mdx).toContain("## Example");
    expect(mdx).toContain(`${fn}(`);
    // These are core functions, not components: no props JSON to render.
    expect(mdx).not.toContain("<PropsTable");
    expect(mdx, `${fn} is imported from @chelone/core on its page`).toContain(
      'from "@chelone/core"',
    );
    expect(mdx).toContain("(/docs/app-config/realtime)");
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  },
);

it("every core function with a page is exported by @chelone/core", () => {
  const coreIndex = readFileSync(
    new URL("../../../packages/core/src/index.ts", import.meta.url),
    "utf8",
  );
  for (const { fn } of coreFunctions) {
    expect(coreIndex, `${fn} in @chelone/core`).toMatch(
      new RegExp(`export \\{[^}]*\\b${fn}\\b`),
    );
  }
});

it("the addEventsForMutations page keeps a failed publish from failing the write", () => {
  const mdx = page("add-events-for-mutations");
  expect(
    mdx,
    "a rejected publish goes to onError and the write still resolves",
  ).toMatch(/rejected\s+publish[\s\S]{0,200}(never\s+fails|still\s+resolves)/);
  expect(mdx, "the wrapper keeps the provider's own type").toContain(
    "TProvider",
  );
});

it("the memoryTransport page pins its start status and its delay", () => {
  const mdx = page("memory-transport");
  expect(mdx, "the hub starts connected").toContain('starts as `"connected"`');
  expect(mdx, "the delay is interruptible by an unsubscribe").toMatch(
    /delayMs[\s\S]{0,240}unsubscribe/,
  );
  expect(mdx, "simulateReconnect drives the reconnect listeners").toMatch(
    /simulateReconnect\([\s\S]{0,200}onReconnect/,
  );
});

it("the broadcastChannelTransport page pins its reach and its closed publish", () => {
  const mdx = page("broadcast-channel-transport");
  expect(mdx, "one browser, not another device").toMatch(
    /tabs of one browser[\s\S]{0,240}(does not reach|never reaches)/,
  );
  expect(mdx, "a publish after close rejects").toMatch(
    /close\(\)[\s\S]{0,200}rejects|rejects[\s\S]{0,200}close\(\)/,
  );
});

it("the webSocketTransport page pins the token modes and the queued publish", () => {
  const mdx = page("websocket-transport");
  expect(mdx, "the token modes and their default").toMatch(
    /authMode[\s\S]{0,400}"query"[\s\S]{0,400}"subprotocol"/,
  );
  expect(mdx, "a publish made before the socket opens waits").toMatch(
    /queue[\s\S]{0,200}(open|connect)/,
  );
});

it("the sseTransport page pins the publish endpoint and the token in the URL", () => {
  const mdx = page("sse-transport");
  expect(mdx, "publish needs publishUrl").toMatch(
    /`publishUrl`[\s\S]{0,160}rejects|rejects[\s\S]{0,160}`publishUrl`/,
  );
  expect(mdx, "EventSource cannot set a header").toMatch(
    /headers[\s\S]{0,240}token|token[\s\S]{0,240}headers/,
  );
});

it("the inMemoryLockProvider page pins a free unlock and a silent provider", () => {
  const mdx = page("in-memory-lock-provider");
  expect(
    mdx,
    "unlocking a free record is a plain error, not a conflict",
  ).toMatch(
    /no\s+lock[\s\S]{0,200}plain\s+error|plain\s+error[\s\S]{0,200}no\s+lock/,
  );
  expect(mdx, "no publisher means no announcement").toMatch(
    /publisher[\s\S]{0,240}silent|silent[\s\S]{0,240}publisher/,
  );
  expect(mdx, '1 and "1" name the same record').toContain('`1` and `"1"`');
});

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
