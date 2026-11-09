// @vitest-environment node

/**
 * `composables.registered.test.ts`: the Vue data composables read the app's
 * registered resources, the twin of `@chelone/react`'s
 * `hooks.registered.test.ts`. Each case runs a real `ts.createProgram` over a
 * file that augments `Register`, because an augmentation in a `test-d` file
 * would change every other type test in the package.
 *
 * The probes import the composable modules by path rather than the package
 * entry: the entry pulls in every `.vue` component, which plain `tsc` cannot
 * read (that set is `vue-tsc`'s job in `pnpm typecheck`), and registering a
 * couple of schemas would narrow every `source` prop in them besides.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * `../../../src/data/queries` from a probe written into
 * `node_modules/.cache/registered-XXXX/`.
 */
const queries = "../../../src/data/queries";
const mutations = "../../../src/data/mutations";
const live = "../../../src/realtime/live";

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
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  noUncheckedIndexedAccess: true,
  verbatimModuleSyntax: true,
  isolatedModules: true,
  types: [],
};

/**
 * One probe file's own diagnostics, not the whole program's. A probe drags in
 * the composable modules and everything they import, and checking all of that
 * is the sources case's job; here the question is only what the probe's own
 * calls do.
 */
const probeDiagnosticsOf = (
  probe: string,
  fileNames: string[],
  options: ts.CompilerOptions = probeCompilerOptions,
) => {
  const program = ts.createProgram(fileNames, options);
  const source = program.getSourceFile(probe);
  if (!source) throw new Error(`The probe ${probe} is not in the program.`);
  return [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ].map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  );
};

/** Each diagnostic as `file:line TScode message`, so two runs can be compared. */
const locatedOf = (fileNames: string[], options: ts.CompilerOptions) => {
  const program = ts.createProgram(fileNames, options);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const file = diagnostic.file
      ? relative(packageRoot, diagnostic.file.fileName)
      : "<none>";
    const line =
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line +
          1
        : 0;
    return `${file}:${line} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`;
  });
};

describe("the data composables in a registered app", () => {
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
      `import { useGetList } from "${queries}";
import { computed } from "vue";
import "./register";

declare const dynamic: string;

const posts = useGetList("posts");
export const title: string | undefined = posts.data.value?.data[0]?.title;
export const total: number | undefined = posts.data.value?.total;

const comments = useGetList("comments");
// @ts-expect-error a comment has no title
export const wrong: string | undefined = comments.data.value?.data[0]?.title;

const loose = useGetList(dynamic);
export const anyField: unknown = loose.data.value?.data[0]?.whatever;

const reactive = useGetList(computed(() => "posts" as const));
export const reactiveTitle: string | undefined =
  reactive.data.value?.data[0]?.title;
`,
    );

    expect(probeDiagnosticsOf(probe, [register, probe])).toEqual([]);
  }, 120_000);

  it("a registered app types the mutation records and the live reads", async () => {
    const register = await write("register-mutate.ts", augmentation);
    const probe = await write(
      "probe-mutate.ts",
      `import { useDelete, useUpdate } from "${mutations}";
import { useGetListLive, useGetOneLive } from "${live}";
import "./register-mutate";

const update = useUpdate("posts", { mutationMode: "undoable" });
update.mutate({ id: 1, data: { title: "new" } });
// @ts-expect-error a post has no body
update.mutate({ id: 1, data: { body: "no" } });

const del = useDelete("comments");
del.mutate({ id: 2, previousData: { id: 2, body: "gone" } });
// @ts-expect-error a comment has no title
del.mutate({ id: 2, previousData: { id: 2, title: "no" } });

const list = useGetListLive("comments");
export const body: string | undefined = list.data.value?.data[0]?.body;

const one = useGetOneLive("posts", { id: 1 });
export const oneTitle: string | undefined = one.data.value?.title;
`,
    );

    expect(probeDiagnosticsOf(probe, [register, probe])).toEqual([]);
  }, 120_000);

  it("a registered app rejects a name it never registered", async () => {
    const register = await write("register-bad.ts", augmentation);
    const probe = await write(
      "probe-bad.ts",
      `import { useGetList } from "${queries}";
import { useUpdate } from "${mutations}";
import { useGetListLive } from "${live}";
import "./register-bad";

export const list = useGetList("psots");
export const update = useUpdate("psots");
export const liveList = useGetListLive("psots");
`,
    );

    // One diagnostic per call. `useGetList` names the widened `string` rather
    // than the literal, so the pin is the count plus the name appearing.
    const diagnostics = probeDiagnosticsOf(probe, [register, probe]);
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.join("\n")).toContain("psots");
  }, 120_000);

  it("every Vue source module compiles in a registered app", async () => {
    const register = await write("register-sources.ts", namesOnlyAugmentation);
    // A probe that only passes while the augmentation is live: an inert
    // `Register` would leave the `@ts-expect-error` unused, and TS2578 would
    // land in the diff below.
    const probe = await write(
      "probe-sources.ts",
      `import { useGetList } from "${queries}";
import "./register-sources";

// @ts-expect-error psots is not a registered resource name
export const bad = useGetList("psots");
`,
    );
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
    // Plain `tsc` cannot read a `.vue` file, so this pin covers the `.ts`
    // modules; `vue-tsc` reads the components, and `apps/vue-demo` reads them
    // under that app's own `Register` augmentation. Test files and their
    // fixtures mount fake resources on purpose, so they name things no
    // registered app would.
    const sources = parsed.fileNames.filter(
      (file) =>
        file.endsWith(".ts") &&
        !file.endsWith(".d.ts") &&
        !/\.test(-d)?\.ts$/.test(file) &&
        !/\/__fixtures__\//.test(file),
    );
    expect(sources.length).toBeGreaterThan(100);

    // The `.ts` set carries noise plain `tsc` cannot clear: a `.vue` import it
    // cannot read, and the tiptap chain methods a component file brings in.
    // The pin is that the augmentation adds nothing to it.
    const bare = new Set(locatedOf(sources, options));
    const added = locatedOf([register, probe, ...sources], options).filter(
      (diagnostic) => !bare.has(diagnostic),
    );
    expect(added).toEqual([]);
  }, 300_000);
});
