#!/usr/bin/env node
// tsc keeps a side-effect `import "./x.css"` in the .d.ts it emits, and a
// consumer's type resolution finds no declaration for it, which attw reports as
// an internal resolution error. A stylesheet import carries no types, so this
// removes it. Safe to run twice.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { argv, exit } from "node:process"

const CSS_IMPORT = /^import\s+(["'])[^"'\n]+\.css\1;?[ \t]*\r?\n/gm

function dtsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return dtsFiles(path)
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : []
  })
}

function main(dist) {
  if (!dist || !existsSync(dist)) {
    console.error("usage: strip-dts-css-imports.mjs <dist folder>")
    return 1
  }
  for (const file of dtsFiles(resolve(dist))) {
    const source = readFileSync(file, "utf8")
    const text = source.replace(CSS_IMPORT, "")
    if (text !== source) writeFileSync(file, text)
  }
  return 0
}

exit(main(argv[2]))
