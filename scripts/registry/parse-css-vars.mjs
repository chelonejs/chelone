// Minimal CSS custom-property extractor for the registry generator.
//
// Parses `--key: value;` declarations out of the rule whose selector list
// contains `selector` exactly. Handles only FLAT blocks (no nested braces),
// which is all our token files contain. Keys are returned WITHOUT the leading
// `--`, matching the shadcn registry `cssVars` convention.

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * @param {string} css  Raw CSS text.
 * @param {string} selector  Exact selector, e.g. ":root", ".dark".
 * @returns {Record<string, string>}
 */
export const parseCssVars = (css, selector) => {
  const text = stripComments(css);
  const out = {};
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let rule;
  while ((rule = ruleRe.exec(text)) !== null) {
    const selectors = rule[1].split(",").map((s) => s.trim());
    if (!selectors.includes(selector)) continue;
    const declRe = /--([\w-]+)\s*:\s*([^;]+);/g;
    let decl;
    while ((decl = declRe.exec(rule[2])) !== null) {
      out[decl[1]] = decl[2].trim();
    }
  }
  return out;
};
