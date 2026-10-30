#!/usr/bin/env node
// tsc emits relative specifiers in .d.ts files without an extension, which
// node16/nodenext resolution cannot follow in an ESM package. This rewrites
// them to the file they resolve to, so it is safe to run twice.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, extname, join, resolve } from "node:path"
import { argv, exit } from "node:process"

const RELATIVE = /^\.\.?(\/|$)/
const WORD = /[\w$]+/y

function dtsFiles(dir) {
  // Dirent does not follow symlinks, so a broken or circular link is skipped.
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return dtsFiles(path)
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : []
  })
}

function isFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

// The specifier with its extension, or null when it resolves to no .d.ts file.
function resolveSpecifier(file, specifier) {
  const path = specifier.replace(/\/$/, "")
  const isFolderOnly = /(^|\/)\.\.?$/.test(path)
  const target = resolve(dirname(file), path)
  if (!isFolderOnly && isFile(`${target}.d.ts`)) return `${path}.js`
  if (isFile(join(target, "index.d.ts"))) return `${path}/index.js`
  if (!isFolderOnly && extname(path)) return specifier
  return null
}

// A string is a module specifier after `from`, `import`, `import(` or `require(`.
function isSpecifierPosition(prev, beforePrev) {
  if (prev === "from" || prev === "import") return true
  return prev === "(" && (beforePrev === "import" || beforePrev === "require")
}

// Walks the source token by token so comments and string literals that merely
// look like an import are left alone. Returns the new text and unresolved specifiers.
function rewrite(file, source) {
  const unresolved = []
  let text = ""
  let copiedTo = 0
  let prev = ""
  let beforePrev = ""
  let i = 0
  const push = (token) => {
    beforePrev = prev
    prev = token
  }

  while (i < source.length) {
    const char = source[i]
    if (char === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i)
      i = end < 0 ? source.length : end
    } else if (char === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2)
      i = end < 0 ? source.length : end + 2
    } else if (char === '"' || char === "'" || char === "`") {
      let end = i + 1
      while (end < source.length && source[end] !== char) end += source[end] === "\\" ? 2 : 1
      const specifier = source.slice(i + 1, end)
      if (char !== "`" && isSpecifierPosition(prev, beforePrev) && RELATIVE.test(specifier)) {
        const next = resolveSpecifier(file, specifier)
        if (next === null) unresolved.push(specifier)
        else if (next !== specifier) {
          text += source.slice(copiedTo, i + 1) + next
          copiedTo = end
        }
      }
      push("string")
      i = end + 1
    } else if (/\s/.test(char)) {
      i += 1
    } else {
      WORD.lastIndex = i
      const word = WORD.exec(source)
      push(word ? word[0] : char)
      i += word ? word[0].length : 1
    }
  }
  return { text: text + source.slice(copiedTo), unresolved }
}

function main(dist) {
  if (!dist || !existsSync(dist)) {
    console.error("usage: dts-extensions.mjs <dist folder>")
    return 1
  }
  try {
    const changes = []
    let failed = false
    for (const file of dtsFiles(resolve(dist))) {
      const source = readFileSync(file, "utf8")
      const { text, unresolved } = rewrite(file, source)
      for (const specifier of unresolved) {
        console.error(`${file}: relative specifier "${specifier}" resolves to no .d.ts file`)
        failed = true
      }
      if (text !== source) changes.push([file, text])
    }
    // Write nothing on failure, so dist never holds a half-rewritten tree.
    if (failed) return 1
    for (const [file, text] of changes) writeFileSync(file, text)
    return 0
  } catch (error) {
    console.error(`dts-extensions: ${error.message}`)
    return 1
  }
}

exit(main(argv[2]))
