const normalise = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Pairs each field with the CSV header it most likely names. Pass one takes an
 * equal name, pass two a header that contains the field, pass three a header
 * the field contains. A later match never takes a header an earlier one took.
 */
export function matchCsvHeaders(
  fields: string[],
  headers: string[],
): Record<string, string> {
  // Every name contains "", so a header with nothing left after normalising
  // would match any field.
  const free = headers
    .map((header) => ({ header, name: normalise(header) }))
    .filter(({ name }) => name !== "");
  const result: Record<string, string> = {};

  const pass = (matches: (field: string, header: string) => boolean) => {
    for (const field of fields) {
      if (field in result) continue;
      const name = normalise(field);
      if (name === "") continue;
      const index = free.findIndex((entry) => matches(name, entry.name));
      const found = free[index];
      if (!found) continue;
      result[field] = found.header;
      free.splice(index, 1);
    }
  };

  pass((field, header) => field === header);
  pass((field, header) => header.includes(field));
  pass((field, header) => field.includes(header));

  return result;
}
