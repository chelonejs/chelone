// Fails when a release pull request's notes hold text release-please's parser
// reads as an HTML tag. It parses the notes, writes them back and parses them
// again, ignoring markdown and decoding entities, so one such tag runs a
// package's notes into the next, or loses a package's release altogether.
//
//   pnpm check:release-notes <pull request number>
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const OWN_TAGS = /<\/?(?:details|summary)>/g;
const TAG_LIKE = /<\/?[a-zA-Z]/;
const OVERFLOW_LINK = /\/blob\/(?<branch>[^/\s]+)\/(?<file>[^\s)]+)/;

export function findTagLikeText(notes) {
  return notes.split("\n").flatMap((text, index) => {
    const decoded = text.replaceAll("&lt;", "<").replace(OWN_TAGS, "");
    return TAG_LIKE.test(decoded) ? [{ line: index + 1, text }] : [];
  });
}

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });

function readNotes(pullRequest) {
  const body = gh("pr", "view", pullRequest, "--json", "body", "--jq", ".body");
  const overflow = body.match(OVERFLOW_LINK)?.groups;
  if (!overflow) return body;
  return gh(
    "api",
    `repos/{owner}/{repo}/contents/${overflow.file}?ref=${overflow.branch}`,
    "--header",
    "Accept: application/vnd.github.raw",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const found = findTagLikeText(readNotes(process.argv[2]));
  for (const { line, text } of found) console.error(`line ${line}: ${text}`);
  if (found.length > 0) {
    console.error("Reword these lines: docs/releasing.md says how.");
    process.exit(1);
  }
}
