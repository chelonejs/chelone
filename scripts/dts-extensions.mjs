#!/usr/bin/env node
// tsc emits relative specifiers in .d.ts files without an extension, which
// node16/nodenext resolution cannot follow in an ESM package. This rewrites
// them to the file they resolve to, so it is safe to run twice.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, extname, join, resolve } from "node:path"
import { argv, exit } from "node:process"

// `from "./x"`, `import("./x")` and `import "./x"`; `export ... from` is the first form.
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.\.?(?:\/[^"']*)?)\2/g

function dtsFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return dtsFiles(path)
    return name.endsWith(".d.ts") ? [path] : []
  })
}

function withExtension(file, specifier) {
  const target = resolve(dirname(file), specifier)
  const bare = specifier.replace(/\/$/, "")
  if (!/(^|\/)\.\.?$/.test(bare) && existsSync(`${target}.d.ts`)) return `${bare}.js`
  if (existsSync(join(target, "index.d.ts"))) return `${bare}/index.js`
  if (extname(bare) && !/(^|\/)\.\.?$/.test(bare)) return specifier
  return null
}

function main(dist) {
  if (!dist || !existsSync(dist)) {
    console.error("usage: dts-extensions.mjs <dist folder>")
    return 1
  }
  let failed = false
  for (const file of dtsFiles(resolve(dist))) {
    const source = readFileSync(file, "utf8")
    const rewritten = source.replace(SPECIFIER, (match, head, quote, specifier) => {
      const next = withExtension(file, specifier)
      if (next === null) {
        console.error(`${file}: relative specifier "${specifier}" resolves to no .d.ts file`)
        failed = true
        return match
      }
      return `${head}${quote}${next}${quote}`
    })
    if (rewritten !== source) writeFileSync(file, rewritten)
  }
  return failed ? 1 : 0
}

exit(main(argv[2]))
