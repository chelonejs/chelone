/**
 * `cn` — the class-name joiner the `ui/` primitives use. The Vue twin of
 * `@chelone/react`'s `@/lib/utils#cn`, kept DEPENDENCY-FREE: the React package
 * pulls `clsx` + `tailwind-merge`, but the V1 Vue slice needs only truthy
 * concatenation (no conflicting-class de-duplication yet), so this stays a
 * zero-dependency filter/join. If a later wave needs tailwind-merge semantics
 * it can be swapped in behind this same signature.
 */

/** A class value: a string, or a nullish/false toggle (dropped), nestable in arrays. */
export type ClassValue = string | false | null | undefined | ClassValue[];

/** Join truthy class values into a single space-separated string. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(value);
    }
  }
  return out.join(" ");
}
