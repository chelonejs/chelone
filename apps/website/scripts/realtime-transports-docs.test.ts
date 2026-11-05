// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const realtime = read("../src/docs/content/app-config/realtime.mdx");
const supabase = read("../src/docs/content/app-config/supabase.mdx");
const coreIndex = read("../../../packages/core/src/index.ts");
const supabaseIndex = read("../../../packages/supabase/src/index.ts");

const exported = (index: string, name: string) =>
  new RegExp(`export (?:type )?\\{[^}]*\\b${name}\\b`).test(index) ||
  new RegExp(`export (?:function|const) ${name}\\b`).test(index);

it("the transports the pages name are exported by @chelone/core and @chelone/supabase", () => {
  for (const name of [
    "broadcastChannelTransport",
    "webSocketTransport",
    "sseTransport",
    "createTopicHub",
  ]) {
    expect(realtime, `${name} on the realtime page`).toContain(name);
    expect(exported(coreIndex, name), `${name} in @chelone/core`).toBe(true);
  }
  for (const name of ["supabaseRealtimeTransport", "supabaseLockProvider"]) {
    expect(supabase, `${name} on the Supabase page`).toContain(name);
    expect(exported(supabaseIndex, name), `${name} in @chelone/supabase`).toBe(
      true,
    );
  }
});

it("every docs link on the realtime and Supabase pages resolves", () => {
  expect(unresolvedDocLinks(realtime)).toEqual([]);
  expect(unresolvedDocLinks(supabase)).toEqual([]);
});

it("the Supabase page ships the locks table SQL with its primary key and policies", () => {
  expect(supabase).toContain("create table chelone_locks");
  expect(supabase).toContain("primary key (resource, record_id)");
  expect(supabase).toContain(
    "alter table chelone_locks enable row level security",
  );
  for (const command of ["select", "insert", "delete"]) {
    expect(supabase, `${command} policy`).toMatch(
      new RegExp(
        `create policy "[^"]+"\\s+on chelone_locks\\s+for ${command}\\b`,
      ),
    );
  }
});

it("the pages no longer say Chelone ships no server transport or Supabase Realtime adapter", () => {
  expect(realtime).not.toMatch(/Chelone ships none/);
  expect(realtime).not.toMatch(/is the app's to supply/);
  expect(supabase).not.toMatch(/has no Supabase Realtime adapter/);
  expect(supabase).not.toMatch(/^- A realtime transport\./m);
});

it("the realtime page documents the wire formats, reconnect defaults and token placement", () => {
  for (const text of [
    "initialDelayMs",
    "maxDelayMs",
    "maxAttempts",
    "jitter",
    "idleDisconnectMs",
    "authMode",
    "getAuthToken",
    "publishUrl",
    '"op":"subscribe"',
    '"op":"publish"',
    '"op":"pong"',
    "{ type, payload, meta }",
    "close()",
    "BroadcastChannel",
  ]) {
    expect(realtime, text).toContain(text);
  }
});
