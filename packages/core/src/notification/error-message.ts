/** The text of a thrown value: a string, or the `message` of an object. */
// type-escape: server: a thrown value has no type
export function errorMessageOf(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error === "" ? undefined : error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error;
    if (typeof message === "string" && message !== "") {
      return message;
    }
  }
  return undefined;
}
