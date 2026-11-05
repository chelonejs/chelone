import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  generateResourceScaffold,
  generateResourcesFile,
} from "./resources-file";

export interface GenIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  cwd: string;
}

const usage = `Usage: chelone-supabase gen --input <types.ts> --out-dir <dir> [--schema public] [--scaffold react|vue]

Writes <out-dir>/schemas.ts (zod schemas from supazod) and <out-dir>/resources.ts
(a defineResources map of them) from the file \`supabase gen types typescript\` wrote.

Options:
  --input <file>        The Supabase types file
  --out-dir <dir>       Where schemas.ts and resources.ts go
  --schema <name>       The database schema to read (default: public)
  --scaffold react|vue  Print <Resource> elements with a guesser on each page
  --help                Print this message
`;

const options = {
  input: { type: "string" },
  "out-dir": { type: "string" },
  schema: { type: "string", default: "public" },
  scaffold: { type: "string" },
  help: { type: "boolean", default: false },
} as const;

type Adapter = "react" | "vue";

const isAdapter = (value: string): value is Adapter =>
  value === "react" || value === "vue";

const oneLine = (error: Error) => error.message.split("\n")[0] ?? "";

const notInstalled = (name: string) =>
  new Error(
    `${name} is not installed: add \`${name}\` as a dev dependency and run the command again.`,
  );

const loadSupazod = () =>
  import("supazod").catch(() => {
    throw notInstalled("supazod");
  });

// database-relations imports typescript, an optional peer: loading it here keeps `--help` and the missing-peer message reachable without it.
const loadReadDatabaseRelations = () =>
  import("./database-relations").then(
    ({ readDatabaseRelations }) => readDatabaseRelations,
    () => {
      throw notInstalled("typescript");
    },
  );

/** Runs `chelone-supabase` with the arguments after the program name, and resolves to the exit code. */
export async function runGen(argv: string[], io: GenIo): Promise<number> {
  try {
    return await gen(argv, io);
  } catch (error) {
    io.stderr(
      `chelone-supabase: ${error instanceof Error ? oneLine(error) : String(error)}\n`,
    );
    return 1;
  }
}

async function gen(argv: string[], io: GenIo): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options,
    allowPositionals: true,
  });
  if (values.help) {
    io.stdout(usage);
    return 0;
  }
  const [command, ...rest] = positionals;
  if (command !== "gen" || rest.length > 0) {
    throw new Error(
      command === undefined
        ? "Missing command. Run `chelone-supabase gen --help`."
        : `Unknown command \`${positionals.join(" ")}\`. Run \`chelone-supabase gen --help\`.`,
    );
  }
  const { input, "out-dir": outDir, schema, scaffold } = values;
  if (input === undefined) throw new Error("Missing --input.");
  if (outDir === undefined) throw new Error("Missing --out-dir.");
  if (scaffold !== undefined && !isAdapter(scaffold)) {
    throw new Error(`--scaffold takes react or vue, not \`${scaffold}\`.`);
  }

  const inputPath = resolve(io.cwd, input);
  const outPath = resolve(io.cwd, outDir);
  const schemasPath = join(outPath, "schemas.ts");
  const resourcesPath = join(outPath, "resources.ts");

  const sourceText = await readFile(inputPath, "utf8").catch(() => {
    throw new Error(`Cannot read the types file ${inputPath}.`);
  });
  const relations = (await loadReadDatabaseRelations())(sourceText, schema);
  const { generateContent, supabaseToZodOptionsSchema } = await loadSupazod();
  const { formatterSchemasFileContent } = await generateContent(
    supabaseToZodOptionsSchema.parse({
      input: inputPath,
      output: schemasPath,
      schema: [schema],
      inlineTypes: true,
    }),
  );
  const resourcesFile = generateResourcesFile({
    relations,
    schema,
    schemasFile: formatterSchemasFileContent,
    schemasImport: "./schemas",
  });

  await mkdir(outPath, { recursive: true });
  await writeFile(schemasPath, formatterSchemasFileContent);
  await writeFile(resourcesPath, resourcesFile);
  io.stdout(`Wrote ${schemasPath}\nWrote ${resourcesPath}\n`);
  if (scaffold !== undefined) {
    io.stdout(`\n${generateResourceScaffold(relations, scaffold)}`);
  }
  return 0;
}
