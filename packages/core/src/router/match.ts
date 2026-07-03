/**
 * A dependency-free path matcher — the string matcher the resource routing
 * engine needs, WITHOUT pulling in a router library (plan §0a-4 / W1-T1).
 *
 * Behavior mirrors react-router's `matchPath` for the subset Chelone uses:
 * literal segments (case-insensitive), `:param` captures (single segment,
 * URI-decoded), and a trailing `*` splat that captures the remainder under the
 * `*` key. `pathnameBase` is the matched portion EXCLUDING the splat remainder
 * (what nested `<Routes>` resolve relative to).
 */

/** A successful match. `pathnameBase` excludes any splat remainder. */
export interface PathMatch {
  params: Record<string, string>;
  pathname: string;
  pathnameBase: string;
}

interface CompiledPattern {
  matcher: RegExp;
  /** Ordered capture names; the splat (if present) is the literal `*`. */
  paramNames: string[];
}

/** Compile a pattern into a case-insensitive regex + ordered param names. */
function compilePattern(pattern: string): CompiledPattern {
  const paramNames: string[] = [];

  let regexpSource = `^${pattern
    // Escape regex-significant chars EXCEPT the ones we handle (`/`, `:`, `*`).
    .replace(/[\\.*+^${}|()[\]]/g, "\\$&")
    // Un-escape `*` — we treat a trailing one specially below.
    .replace(/\\\*/g, "*")
    .replace(/^\/*/, "/") // ensure a single leading slash
    .replace(/\/+$/, "") // drop trailing slashes (matched optionally below)
    // `:param` -> a single-segment capture group.
    .replace(/\/:(\w+)/g, (_m, name: string) => {
      paramNames.push(name);
      return "/([^\\/]+)";
    })}`;

  if (pattern.endsWith("*")) {
    paramNames.push("*");
    // Capture the remainder. `\\/*` allows the optional separating slash so
    // `/posts` (no trailing slash), `/posts/` and `/posts/x` all match a
    // `/posts/*` pattern with the right remainder.
    regexpSource +=
      pattern === "*" || pattern === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else {
    // Match the exact pathname, tolerating a single optional trailing slash.
    regexpSource += "\\/*$";
  }

  return { matcher: new RegExp(regexpSource, "i"), paramNames };
}

/** Safe URI-decode: fall back to the raw value on a malformed sequence. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Match `pathname` against `pattern`. Returns the captured params, the matched
 * `pathname`, and `pathnameBase` (the match minus any splat remainder), or
 * `null` when the pattern does not match.
 */
export function matchPath(pattern: string, pathname: string): PathMatch | null {
  const { matcher, paramNames } = compilePattern(pattern);
  const match = pathname.match(matcher);
  if (!match) return null;

  const matchedPathname = match[0];
  const hasSplat = paramNames[paramNames.length - 1] === "*";
  let pathnameBase = matchedPathname;

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    if (name === "*") {
      const splat = match[index + 1] ?? "";
      // The base is the matched pathname with the splat remainder removed.
      pathnameBase = matchedPathname
        .slice(0, matchedPathname.length - splat.length)
        .replace(/(.)\/+$/, "$1");
      params["*"] = splat;
    } else {
      params[name] = safeDecode(match[index + 1] ?? "");
    }
  });

  // A bare `*` (or `/*`) that matched the whole pathname resolves to a `/` base.
  if (hasSplat && pathnameBase === "") pathnameBase = "/";
  // Normalize the reported pathname (strip a trailing slash, keep root `/`).
  const normalizedPathname =
    matchedPathname.length > 1
      ? matchedPathname.replace(/\/+$/, "")
      : matchedPathname;

  return { params, pathname: normalizedPathname || "/", pathnameBase };
}
