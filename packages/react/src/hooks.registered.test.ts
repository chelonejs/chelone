// @vitest-environment node

/**
 * `hooks.registered.test.ts`: the data hooks read the app's registered
 * resources. Each case runs a real `ts.createProgram` over a file that augments
 * `Register`, because an augmentation in a `test-d` file would change every
 * other type test in the package — the same reason the supabase CLI's compile
 * test writes files instead.
 *
 * The probe files live under this package's `node_modules/.cache/`, where
 * `@chelone/core`, `zod` and React resolve. They import the hook modules by
 * path rather than the package entry on purpose: the entry pulls in every
 * component, and registering a couple of schemas would narrow every `source`
 * prop in them, which is the `source` side's business, not the hooks'.
 */
import { fileURLToPath } from "node:url";
import {
  createProbeDir,
  diagnosticsOf,
  namesOnlyAugmentation,
  type ProbeDir,
  packageProgramOf,
  probeCompilerOptions,
  probeDiagnosticsOf,
  schemaAugmentation,
} from "@chelone/test-utils/compile-probe";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/** `../../../src/hooks` from a probe written into `node_modules/.cache/registered-XXXX/`. */
const hooks = "../../../src/hooks";
const liveHooks = "../../../src/live-hooks";

/**
 * The probe options with `jsx` set. The hook modules reach `src/context.tsx`,
 * and without it `tsc` refuses that import (TS6142) and the probe reads the
 * unregistered `LooseRecord` fallback instead of the registered record.
 */
const reactProbeOptions: ts.CompilerOptions = {
  ...probeCompilerOptions,
  jsx: ts.JsxEmit.ReactJSX,
};

describe("the data hooks in a registered app", () => {
  let probeDir: ProbeDir;

  beforeAll(async () => {
    probeDir = await createProbeDir(packageRoot);
  }, 60_000);

  afterAll(async () => {
    await probeDir.dispose();
  });

  it("a registered app types useGetList by name", async () => {
    const register = await probeDir.write("register.ts", schemaAugmentation);
    const probe = await probeDir.write(
      "probe.ts",
      `import { useGetList } from "${hooks}";
import "./register";

declare const dynamic: string;

const posts = useGetList("posts");
export const title: string | undefined = posts.data?.data[0]?.title;
export const total: number | undefined = posts.data?.total;

const comments = useGetList("comments");
// @ts-expect-error a comment has no title
export const wrong: string | undefined = comments.data?.data[0]?.title;

const loose = useGetList(dynamic);
export const anyField: unknown = loose.data?.data[0]?.whatever;
`,
    );

    expect(
      probeDiagnosticsOf(
        probe,
        [register, probe],
        reactProbeOptions,
        packageRoot,
      ),
    ).toEqual([]);
  }, 120_000);

  it("a registered app types the mutation records and the live reads", async () => {
    const register = await probeDir.write(
      "register-mutate.ts",
      schemaAugmentation,
    );
    const probe = await probeDir.write(
      "probe-mutate.ts",
      `import { useDelete, useUpdate } from "${hooks}";
import { useGetOneLive } from "${liveHooks}";
import "./register-mutate";

const update = useUpdate("posts", { mutationMode: "undoable" });
update.mutate({ id: 1, data: { title: "new" } });
// @ts-expect-error a post has no body
update.mutate({ id: 1, data: { body: "no" } });

const del = useDelete("comments");
del.mutate({ id: 2, previousData: { id: 2, body: "gone" } });
// @ts-expect-error a comment has no title
del.mutate({ id: 2, previousData: { id: 2, title: "no" } });

const live = useGetOneLive("posts", { id: 1 });
export const liveTitle: string | undefined = live.data?.title;
// @ts-expect-error a post has no body
export const liveBody: string | undefined = live.data?.body;
`,
    );

    expect(
      probeDiagnosticsOf(
        probe,
        [register, probe],
        reactProbeOptions,
        packageRoot,
      ),
    ).toEqual([]);
  }, 120_000);

  it("a registered app rejects a name it never registered", async () => {
    const register = await probeDir.write(
      "register-bad.ts",
      schemaAugmentation,
    );
    const probe = await probeDir.write(
      "probe-bad.ts",
      `import { useGetList } from "${hooks}";
import "./register-bad";

export const list = useGetList("psots");
`,
    );

    const diagnostics = probeDiagnosticsOf(
      probe,
      [register, probe],
      reactProbeOptions,
      packageRoot,
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain("psots");
  }, 120_000);

  it("every React source compiles in a registered app", async () => {
    const register = await probeDir.write(
      "register-sources.ts",
      namesOnlyAugmentation,
    );
    // Test files and their fixtures mount fake resources on purpose, so they
    // name things no registered app would. The pin is the shipped source.
    const { options, sources } = packageProgramOf(packageRoot);
    expect(sources.length).toBeGreaterThan(100);

    expect(diagnosticsOf([...sources, register], options, packageRoot)).toEqual(
      [],
    );
  }, 300_000);
});
