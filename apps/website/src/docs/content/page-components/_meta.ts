import type { MetaEntry } from "@/docs/types";

// CsvImport sits with the list pages it is dropped into.
export default [
  { dir: "list", title: "List" },
  { slug: "csv-import", title: "CsvImport" },
  { dir: "edit", title: "Edit" },
  { slug: "create", title: "Create" },
  { slug: "show", title: "Show" },
  { slug: "list-guesser", title: "ListGuesser" },
  { slug: "show-guesser", title: "ShowGuesser" },
  { slug: "edit-guesser", title: "EditGuesser" },
] satisfies MetaEntry[];
