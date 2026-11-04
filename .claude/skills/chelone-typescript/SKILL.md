---
name: chelone-typescript
description: Exact typing in chelone. Use before writing or changing any TypeScript or Vue script, and whenever you are about to reach for `as`, `!`, `any`, `unknown` or `Record<string, unknown>`, add a generic, type a prop or a `source`, or touch the resource registry (`Register`, `defineResources`, `createResourceComponents`).
---

# Exact types in chelone

Chelone's types are part of its API. An app that registers its resources gets every `source`, every field value and every record checked by the compiler, and one loose type anywhere on the way breaks that for everyone downstream. The bar is the one `dot.paths` and the ridiculous registry hold: the compiler knows the exact type at every step, and a wrong program does not compile.

Write the exact type, even when it costs a generic, an overload or a type test. A loose type that compiles today is a bug report from an app tomorrow.

## The bar

| Construct | Rule |
|---|---|
| `any`, `as any` | Never. The one existing site (`genericMemo`) is a known TypeScript limit with a comment saying so. |
| `x as unknown as T`, `x as never` | Never. Fix the type that made the cast necessary, even when that is a bigger change than the ticket looked like. |
| `x as T` | Only for an honest narrowing the compiler cannot see, with a comment saying why it holds. A narrowing it can see is a type guard or a discriminant check. |
| `x!` | Only where the comment proves the value exists. Otherwise handle the missing case. |
| `unknown` | Only at a real boundary: raw JSON from a server, a `catch` binding, a type guard's input, an app's opaque `meta` bag. Everywhere else the type is knowable, so write it. |
| `Record<string, unknown>` and aliases of it | Not a record type. A record is the registered record or a generic the caller fixes. |
| `LooseRecord` | The fallback for an app that registered nothing. Never a shortcut for "some record": a component that handles records takes `TRecord` instead. |

Renaming `unknown` to an alias does not fix it. Moving a cast into a helper does not fix it either, unless the helper narrows for real.

## The registry

The app registers its resources once, and core reads them through one augmentation point (`packages/core/src/resource/register.ts`):

```ts
const resources = defineResources({ posts: { schema: postSchema } });
declare module "@chelone/core" {
  interface Register { resources: typeof resources }
}
```

- `defineResources` takes a `const` generic, so resource names stay literal and each schema's output type survives. Build the map as one literal. An array passed through `Object.fromEntries` collapses every record type and nothing is checked.
- `RegisteredResources`, `RegisteredResourceName` and `RegisteredRecord<TName>` read the registration and fall back to `ResourceMap`, `string` and `LooseRecord` when there is none. `RecordOf<TResources, TName>` is the same lookup over any map.
- `createResourceComponents("posts")` (`packages/react/src/resource/create-resource-components.tsx`, `packages/vue/src/create-resource-components.ts`) returns that resource's views, fields and inputs with `source` typed by its record, with no type arguments. A new field or input that takes a `source` joins its member list in both adapters.

Path types live in `packages/core/src/resource/source-path.ts`, built on `dot.paths`' `Paths` and `Get` with bracket arrays (`items[0].sku`):

| Type | What it is |
|---|---|
| `SourcePath<TRecord>` | every legal path into the record |
| `SourceValue<TRecord, TPath>` | the value at a path, with the `undefined` of every optional parent |
| `SourceKey<TRecord>` | top-level keys, for props that read one flat key |
| `RowSourcePath<TRecord>` | paths relative to an array item, for iterator children |
| `FilterSourceKey<TRecord>` | `q`, or a path with an operator suffix |
| `SourceProp<TRecord>` | what a `source` prop takes |

Each one guards with `unknown extends TRecord ? string : ...`, so a loose record still accepts any string. That guard is load-bearing: `Paths<unknown>` is `never` and would reject every source.

A value read through a `source` is `SourceValue<TRecord, TSource>`, not `unknown`. When `TRecord` is a type parameter that type stays deferred inside the component; narrow it with `typeof` or a guard where you use it, and keep the public signature exact.

## Generics

- Let the caller fix the type. A component, hook or controller that handles records takes `TRecord` (constrained, with a default) and threads it through every prop, callback and return. Never widen it to a loose type inside and cast back out.
- Infer from arguments where you can, and otherwise pass the type down from the generic that already has it. Inside a field typed `RecordType`, call `useFieldValue<RecordType, TSource>(...)`; an app author should never have to write type arguments.
- Use `const` type parameters to keep literals literal (names, tuples, option lists).
- Constrain with `extends` instead of accepting anything and checking at runtime.
- Use `NoInfer<T>` on an argument that must not widen the inferred type (a default value, a fallback).
- In conditional types, distribute on purpose (`T extends unknown ? ... : never`) and guard `any` (`0 extends 1 & T`), because `any` absorbs a union and turns every branch into `any`.
- Recursive types get a depth cap, as `dot.paths` does (`{ depth: 8 }`) and `source-path.ts` does (`_WalkDepth`), so a recursive record terminates.
- A Vue component that is generic over its record says so, as the fields do: `<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">`. A `Record<string, unknown>` constraint there is a gap to fix.

## Instead of a cast

- A type guard (`function isX(v: unknown): v is X`) for a value from outside. Put it in core when both adapters need it.
- A discriminated union and a `switch` for a value with several shapes.
- `satisfies` to check an object against a type without widening it.
- Overloads when the return type depends on an argument.
- Mapped and template literal types for a shape the compiler can compute. The ridiculous registry's call-site validators are the model: `<S extends string>(value: S & Literal<S>): S` makes a bad literal a type error at the argument.
- `T | (string & {})` when a prop suggests known literals but must accept any string.
- When a library's type and ours disagree, align ours with the library's (for geo, `geojson`'s types), or write one converter function that maps between them.
- In tests, a typed factory (defaults plus overrides) per package instead of a partial object cast to the full type.

## Prove it

A type change ships with a type test. Type tests are `*.test-d.ts` files run by `vitest --typecheck` (`packages/core/src/resource/source-path.test-d.ts` is the model):

- `expectTypeOf(x).toEqualTypeOf<...>()` pins the type a caller gets.
- `// @ts-expect-error` above a wrong call pins that it fails. A misspelled `source` must fail.
- A run passes only when the summary shows `Type Errors  no errors`.

Before you push, this prints nothing:

```bash
git diff origin/main -- '*.ts' '*.tsx' '*.vue' | grep -nE '^\+.*(as unknown as| as never\b| as any\b|: any\b|<any>)'
```

Then read every other `as`, `!` and `unknown` your diff adds, and check each one against the bar above.
