/**
 * A deployed page that changes on demand, for `<CheckForApplicationUpdate>`:
 * the check fetches a URL and compares its body with the first one it saw, and
 * a static demo has no new build to fetch. While installed, `fetch` answers
 * `url` with the current build and leaves every other URL to the real `fetch`.
 */

export interface FakeDeploy {
  /** The URL to give `<CheckForApplicationUpdate url>`. */
  readonly url: string;
  /** Ships a new build: the next check sees a different body. */
  release: () => void;
  /** Starts answering `url`. Returns the function that restores `fetch`. */
  install: () => () => void;
}

export function createFakeDeploy(): FakeDeploy {
  const url = "https://demo.chelone.invalid/index.html";
  let build = 1;
  return {
    url,
    release: () => {
      build += 1;
    },
    install: () => {
      const realFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) =>
        input === url
          ? new Response(`<html>build ${build}</html>`)
          : realFetch(input, init);
      return () => {
        globalThis.fetch = realFetch;
      };
    },
  };
}
