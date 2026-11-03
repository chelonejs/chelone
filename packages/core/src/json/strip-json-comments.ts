/** The index just past the string literal that starts at `start`. */
function skipString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
  return i + 1;
}

function removeComments(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
    } else if (text[i] === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text[i] === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      out += " ";
    } else {
      out += text[i++];
    }
  }
  return out;
}

function removeTrailingCommas(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
    } else if (text[i] === ",") {
      let next = i + 1;
      while (/\s/.test(text[next] ?? "")) next++;
      if (text[next] !== "}" && text[next] !== "]") out += ",";
      i++;
    } else {
      out += text[i++];
    }
  }
  return out;
}

/**
 * Removes comments and trailing commas from JSON text, the two things Monaco
 * tolerates when `allowComments` is on and `JSON.parse` does not. String
 * contents are left alone.
 */
export function stripJsonComments(text: string): string {
  return removeTrailingCommas(removeComments(text));
}
