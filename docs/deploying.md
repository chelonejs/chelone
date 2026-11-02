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
| Environment variables | `NODE_VERSION=24`, `PNPM_VERSION=10.14.0` (production and preview) |
| Custom domain | `chelone.dev`, a proxied `CNAME` to `chelone.pages.dev` in the `chelone.dev` zone |

Every push to `main` deploys production. Every other branch, and every pull request, gets a
preview at `<branch>.chelone.pages.dev`. Keep `PNPM_VERSION` in step with `packageManager` in
the root `package.json`, and `NODE_VERSION` with the Node version in `.github/workflows/ci.yml`.

## What the build serves

- `/`, `/docs/<section>` and `/docs/<slug>`: the docs site, prerendered by `react-router build`
- `404.html`: the SPA fallback from `apps/website/scripts/copy-spa-fallback.mjs`, which Pages
  serves for any unknown path
- `/demo/`: the React demo, from `apps/website/scripts/copy-demo.mjs`
- `/r/`: the shadcn registry, from `apps/website/scripts/copy-registry.mjs`

Pages redirects a path without a trailing slash to the one with it, so
`/docs/getting-started/install` answers 308 and then 200.

## Checking a deploy

```sh
curl -sI https://chelone.dev/ | grep -E '^HTTP' | tail -1
curl -sIL https://chelone.dev/docs/getting-started/install | grep -E '^HTTP' | tail -1
curl -sI https://chelone.dev/demo/ | grep -E '^HTTP' | tail -1
curl -sI https://chelone.dev/r/registry.json | grep -iE '^(HTTP|content-type)'
```

Each answers 200, and the registry answers with `application/json`. The landing page sends a
103 Early Hints line first, which is why the commands keep the last status line.
