#!/usr/bin/env node
// tsc leaves the `@/components`, `@/lib` and `@/hooks` aliases as written in
// the .d.ts files it emits, and a consumer cannot resolve them. This rewrites
// each to a path relative to the file, so it is safe to run twice. Extensions
// are left to dts-extensions.mjs, which runs after it.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { argv, exit } from "node:process"

// A module specifier follows `from`, `import` or `import(`.
const ALIAS = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])@\/(components|lib|hooks)((?:\/[^"']*)?)\2/g

function dtsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return dtsFiles(path)
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : []
  })
}

function main(dist) {
  if (!dist || !existsSync(dist)) {
    console.error("usage: rewrite-dts-aliases.mjs <dist folder>")
    return 1
  }
  const root = resolve(dist)
  try {
    for (const file of dtsFiles(root)) {
      const source = readFileSync(file, "utf8")
      const text = source.replace(ALIAS, (_, lead, quote, folder, rest) => {
        const path = relative(dirname(file), join(root, folder, rest))
        const specifier = path.startsWith(".") ? path : `./${path}`
        return `${lead}${quote}${specifier}${quote}`
      })
      if (text !== source) writeFileSync(file, text)
    }
    return 0
  } catch (error) {
    console.error(`rewrite-dts-aliases: ${error.message}`)
    return 1
  }
}

exit(main(argv[2]))
