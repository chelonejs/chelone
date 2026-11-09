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
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/** `../../../src/hooks` from a probe written into `node_modules/.cache/registered-XXXX/`. */
const hooks = "../../../src/hooks";
const liveHooks = "../../../src/live-hooks";

/** A registered app: two resources with schemas, so a name has a record. */
const augmentation = `import { defineResources } from "@chelone/core";
import { z } from "zod";

export const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: { schema: z.object({ id: z.number(), body: z.string() }) },
});

declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
  }
}
`;

/**
 * The same resources with no schema. Registering schemas would also narrow
 * every `source` prop, which is the `source` side's looseness and not this
 * test's: here only the resource names are registered.
 */
const namesOnlyAugmentation = `import { defineResources } from "@chelone/core";

export const resources = defineResources({
  posts: {},
  comments: {},
  authors: {},
});

declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
  }
}
`;

const probeCompilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  noUncheckedIndexedAccess: true,
  verbatimModuleSyntax: true,
  isolatedModules: true,
  types: [],
};

const diagnosticsOf = (
  fileNames: string[],
  options: ts.CompilerOptions = probeCompilerOptions,
) => {
  const program = ts.createProgram(fileNames, options);
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
};

describe("the data hooks in a registered app", () => {
  let dir: string;

  beforeAll(async () => {
    const cache = join(packageRoot, "node_modules", ".cache");
    await mkdir(cache, { recursive: true });
    dir = await mkdtemp(join(cache, "registered-"));
  }, 60_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const write = async (name: string, text: string) => {
    const path = join(dir, name);
    await writeFile(path, text);
    return path;
  };

  it("a registered app types useGetList by name", async () => {
    const register = await write("register.ts", augmentation);
    const probe = await write(
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

    expect(diagnosticsOf([register, probe])).toEqual([]);
  }, 120_000);

  it("a registered app types the mutation records and the live reads", async () => {
    const register = await write("register-mutate.ts", augmentation);
    const probe = await write(
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

    expect(diagnosticsOf([register, probe])).toEqual([]);
  }, 120_000);

  it("a registered app rejects a name it never registered", async () => {
    const register = await write("register-bad.ts", augmentation);
    const probe = await write(
      "probe-bad.ts",
      `import { useGetList } from "${hooks}";
import "./register-bad";

export const list = useGetList("psots");
`,
    );

    const diagnostics = diagnosticsOf([register, probe]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain("psots");
  }, 120_000);

  it("every React source compiles in a registered app", async () => {
    const register = await write("register-sources.ts", namesOnlyAugmentation);
    const read = ts.readConfigFile(
      join(packageRoot, "tsconfig.json"),
      ts.sys.readFile,
    );
    expect(read.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      ts.sys,
      packageRoot,
    );
    // The probe sits outside `src`, and the program emits nothing.
    const options: ts.CompilerOptions = {
      ...parsed.options,
      rootDir: packageRoot,
      noEmit: true,
      declaration: false,
    };
    // Test files and their fixtures mount fake resources on purpose, so they
    // name things no registered app would. The pin is the shipped source.
    const sources = parsed.fileNames.filter(
      (file) =>
        !/\.test(-d)?\.tsx?$/.test(file) && !/\/__fixtures__\//.test(file),
    );
    expect(sources.length).toBeGreaterThan(100);

    expect(diagnosticsOf([...sources, register], options)).toEqual([]);
  }, 300_000);
});
