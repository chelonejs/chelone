#!/usr/bin/env node
// tsc leaves the `@/components`, `@/lib` and `@/hooks` aliases as written in
// the .d.ts files it emits, and a consumer cannot resolve them. This rewrites
// each to a path relative to the file, so it is safe to run twice. Extensions
// are left to dts-extensions.mjs, which runs after it and fails on a specifier
// that resolves to no file. Any other `@/` specifier fails the run instead of
// shipping.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { argv, exit } from "node:process"

const FOLDERS = new Set(["components", "lib", "hooks"])

// Comments and other string literals are matched first so they are copied
// through; only a string after `from`, `import` or `import(` is a specifier.
const TOKEN =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])@\/([^"']*)\2|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g

// Every .d.ts file under `dir`, in directory order.
function dtsFiles(dir) {
  // Dirent does not follow symlinks, so a broken or circular link is skipped.
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return dtsFiles(path)
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : []
  })
}

// The new text and the `@/` specifiers that are not one of the three aliases.
function rewrite(file, root, source) {
  const unresolved = []
  const text = source.replace(TOKEN, (match, lead, quote, path) => {
    if (lead === undefined) return match
    const [folder, ...rest] = path.split("/")
    if (!FOLDERS.has(folder) || rest.includes("..")) {
      unresolved.push(`@/${path}`)
      return match
    }
    const target = relative(dirname(file), join(root, folder, ...rest))
    const specifier = target.startsWith(".") ? target : `./${target}`
    return `${lead}${quote}${specifier}${quote}`
  })
  return { text, unresolved }
}

// Takes the dist folder; returns the exit code. Writes nothing on failure, so
// dist never holds a half-rewritten tree.
function main(dist) {
  if (!dist || !existsSync(dist)) {
    console.error("usage: rewrite-dts-aliases.mjs <dist folder>")
    return 1
  }
  const root = resolve(dist)
  try {
    const changes = []
    let failed = false
    for (const file of dtsFiles(root)) {
      const source = readFileSync(file, "utf8")
      const { text, unresolved } = rewrite(file, root, source)
      for (const specifier of unresolved) {
        console.error(`${file}: specifier "${specifier}" is not one of the rewritten aliases`)
        failed = true
      }
      if (text !== source) changes.push([file, text])
    }
    if (failed) return 1
    for (const [file, text] of changes) writeFileSync(file, text)
    return 0
  } catch (error) {
    console.error(`rewrite-dts-aliases: ${error.stack ?? error.message}`)
    return 1
  }
}

exit(main(argv[2]))
