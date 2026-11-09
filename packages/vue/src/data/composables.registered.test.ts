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
import { fileURLToPath } from "node:url";
import {
  createProbeDir,
  locatedDiagnosticsOf,
  locatedText,
  namesOnlyAugmentation,
  type ProbeDir,
  packageProgramOf,
  probeCompilerOptions,
  probeDiagnosticsOf,
  schemaAugmentation,
} from "@chelone/test-utils/compile-probe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * `../../../src/data/queries` from a probe written into
 * `node_modules/.cache/registered-XXXX/`.
 */
const queries = "../../../src/data/queries";
const mutations = "../../../src/data/mutations";
const live = "../../../src/realtime/live";

describe("the data composables in a registered app", () => {
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

    expect(
      probeDiagnosticsOf(
        probe,
        [register, probe],
        probeCompilerOptions,
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

    expect(
      probeDiagnosticsOf(
        probe,
        [register, probe],
        probeCompilerOptions,
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
    const diagnostics = probeDiagnosticsOf(
      probe,
      [register, probe],
      probeCompilerOptions,
      packageRoot,
    );
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.join("\n")).toContain("psots");
  }, 120_000);

  it("every Vue source module compiles in a registered app", async () => {
    const register = await probeDir.write(
      "register-sources.ts",
      namesOnlyAugmentation,
    );
    // A probe that only passes while the augmentation is live: an inert
    // `Register` would leave the `@ts-expect-error` unused, and TS2578 would
    // land in the diff below.
    const probe = await probeDir.write(
      "probe-sources.ts",
      `import { useGetList } from "${queries}";
import "./register-sources";

// @ts-expect-error psots is not a registered resource name
export const bad = useGetList("psots");
`,
    );
    // Plain `tsc` cannot read a `.vue` file, so this pin covers the `.ts`
    // modules; `vue-tsc` reads the components, and `apps/vue-demo` reads them
    // under that app's own `Register` augmentation. Test files and their
    // fixtures mount fake resources on purpose, so they name things no
    // registered app would.
    const { options, sources } = packageProgramOf(packageRoot);
    expect(sources.length).toBeGreaterThan(100);

    // The `.ts` set carries noise plain `tsc` cannot clear: a `.vue` import it
    // cannot read, and the tiptap chain methods a component file brings in.
    // The pin is that the augmentation adds nothing to it.
    const bare = new Set(
      locatedDiagnosticsOf(sources, options, packageRoot).map(locatedText),
    );
    const added = locatedDiagnosticsOf(
      [register, probe, ...sources],
      options,
      packageRoot,
    )
      .map(locatedText)
      .filter((diagnostic) => !bare.has(diagnostic));
    expect(added).toEqual([]);
  }, 300_000);
});
