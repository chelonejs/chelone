# Deploying

The site at `https://chelone.dev` is a Cloudflare Pages project named `chelone`, connected to
`chelonejs/chelone` through the Cloudflare Workers and Pages GitHub app. Cloudflare builds it,
so no workflow in this repository deploys it.

## Settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Output folder | `apps/website/build/client` |
| Root directory | the repository root |
| Environment variables | `NODE_VERSION=26`, `PNPM_VERSION=12.16.1` (production and preview) |
| Custom domain | `chelone.dev`, a proxied `CNAME` to `chelone.pages.dev` in the `chelone.dev` zone |

Every push to `main` deploys production. Every other branch, and every pull request, gets a
preview at `<branch>.chelone.pages.dev`. Keep `PNPM_VERSION` in step with `packageManager` in
the root `package.json`, and `NODE_VERSION` with the Node version in `.github/workflows/ci.yml`.

## What the build serves

- `/`, `/docs/<section>` and `/docs/<slug>`: the docs site, prerendered by `react-router build`
- `404.html`: the SPA fallback from `apps/website/scripts/copy-spa-fallback.mjs`, which Pages
  serves for any unknown path
- `/demo/` and `/vue-demo/`: the React and Vue demos, from `apps/website/scripts/copy-demo.mjs`,
  each folder holding its own `404.html` copied from that demo's `index.html`
- `/r/`: the shadcn registry, from `apps/website/scripts/copy-registry.mjs`

Pages redirects a path without a trailing slash to the one with it, so
`/docs/getting-started/install` answers 308 and then 200.

Pages answers an unmatched path with the `404.html` nearest to it, so each demo keeps its own:
`/demo/posts` finds `demo/404.html`, loads the demo's shell, which pulls `/demo/assets/*` and
lets the demo's router render the route. Without that copy the path falls through to the site
root's fallback and renders the docs site. The status is 404, accepted for a client-rendered
demo: the demo has no server route to answer 200, and the page boots the same either way.

## Checking a deploy

```sh
curl -sI https://chelone.dev/ | grep -E '^HTTP' | tail -1
curl -sIL https://chelone.dev/docs/getting-started/install | grep -E '^HTTP' | tail -1
curl -sI https://chelone.dev/demo/ | grep -E '^HTTP' | tail -1
curl -sI https://chelone.dev/r/registry.json | grep -iE '^(HTTP|content-type)'
```

Each answers 200, and the registry answers with `application/json`. The landing page sends a
103 Early Hints line first, which is why the commands keep the last status line.

A demo deep link ends at 404 and still serves the demo:

```sh
curl -sIL https://chelone.dev/demo/posts | grep -E '^HTTP' | tail -1
curl -s https://chelone.dev/demo/posts | grep -c '/demo/assets/'
```

The last status line is 404, and the count is how many of the demo's own asset URLs the shell it
returned holds. Any count above 0 means `demo/404.html` answered; 0 means the site root's
fallback did. `/vue-demo/posts` is the same pair with `vue-demo`.
