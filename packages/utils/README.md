# @chelone/utils

Shared helpers for Chelone, a headless admin engine. They live here because they wrap third-party libraries `@chelone/core` may not import, and both adapters need one copy of each.

There is no root entry: import a subpath.

```bash
pnpm add @chelone/utils
```

| Subpath | Contents | Optional peers |
| --- | --- | --- |
| `@chelone/utils/cron` | cron expression helpers | `cronstrue` |
| `@chelone/utils/geo` | GeoJSON cut and simplify | `@turf/difference`, `@turf/simplify` |
| `@chelone/utils/i18next` | an `I18nProvider` over an i18next instance, and a catalog converter | `i18next` |
| `@chelone/utils/osm` | Overpass and mask geometry | `@turf/buffer`, `@turf/difference`, `@turf/union`, `osm2geojson-lite` |

Each peer is optional in `peerDependenciesMeta`, so a subpath you never import never asks for its library. `@tanstack/query-core` is the one required peer.
