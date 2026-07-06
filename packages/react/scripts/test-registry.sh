#!/bin/bash

# End-to-end registry install test — the LIVE (registry-URL) variant is DEFERRED.
#
# ============================ READ THIS FIRST ============================
# WHAT THIS DEFERS, AND WHAT IT DOES NOT.
#
# This LIVE script exercises the real `shadcn add http://…/admin.json` path
# against a served dist/. It is deferred ONLY because that path pulls
# @chelone/core + @chelone/react from the PUBLIC npm registry (a real
# `pnpm install`), and both are unpublished 0.0.0 workspace packages today —
# publishing them is a USER ACTION (npm org). Set CHELONE_REGISTRY_E2E=1 once
# they are on npm; until then this exits early with a reminder.
#
# IMPORTANT — publish is NOT the only thing this would have caught, and it is
# NOT the only offline coverage:
#   * The ENGINE-SEAM / escaping-relative class (copied admin source importing
#     the engine via deep `../../../*` relatives that 404 in a consumer) is now
#     covered OFFLINE, with NO publish required, by:
#       - the content-aware escaping-relative validator in build-registry.mjs
#         (validateNoEngineEscapes) — asserts no shipped file imports an engine
#         relative; runs on every `registry:build`; AND
#       - scripts/test-registry-local.mjs — a LOCAL LINKED-CONSUMER E2E that
#         materializes a scratch consumer, copies representative items + their
#         registryDependency files, links @chelone/{core,react} from the
#         workspace (no npm publish needed), and `tsc --noEmit`s the copied
#         source. GREEN there = every import resolves (engine via @chelone/react,
#         siblings via preserved structure, ui via @/). Run: `pnpm registry:test-local`.
#   Before this wave, the seam bug slipped through precisely because that
#   content-aware install proof was missing — the old gates only checked
#   @chelone/<x> registry refs + declared-file existence, never file CONTENT.
# ========================================================================
#
# When enabled, run from the package root:
#   cd packages/react && CHELONE_REGISTRY_E2E=1 ./scripts/test-registry.sh
#
# It builds the registry, serves dist on http://localhost:8080, scaffolds a
# fresh standalone Vite consumer in a temp folder, runs `shadcn add` against the
# local registry, and builds the scaffold — exactly like a real consumer.

set -euo pipefail

if [ "${CHELONE_REGISTRY_E2E:-0}" != "1" ]; then
  cat >&2 <<'EOF'
[test-registry] SKIPPED — the LIVE (registry-URL) consumer E2E is deferred.

  Deferred ONLY because `shadcn add http://…/admin.json` runs a real
  `pnpm install` that pulls @chelone/core + @chelone/react from PUBLIC npm, and
  both are unpublished (0.0.0). Publish both, then re-run with:

    CHELONE_REGISTRY_E2E=1 ./scripts/test-registry.sh

  This is NOT the only coverage of the engine-seam / escaping-relative class —
  that class is proven OFFLINE right now (no publish needed) by:
    * validateNoEngineEscapes in build-registry.mjs (every registry:build), and
    * the local linked-consumer E2E:  pnpm registry:test-local
EOF
  exit 0
fi

# Pin the shadcn CLI (matches build-registry.mjs). `@latest` drifts and breaks
# resolution against a specific registry-item schema.
SHADCN_VERSION="4.11.0"

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# A standalone consumer must carry the `@/*` alias in BOTH vite + tsconfig, and
# — critically — the ROOT tsconfig.json needs `compilerOptions.paths` or shadcn
# dumps files into a literal `@/` folder.
write_standalone_configs() {
  local target_dir=$1

  cat > "$target_dir/vite.config.ts" <<'EOF'
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
});
EOF

  cat > "$target_dir/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
EOF

  cat > "$target_dir/pnpm-workspace.yaml" <<'EOF'
packages: []
EOF
}

setup_temp_app() {
  local target_dir=$1

  rm -rf "$target_dir"
  mkdir "$target_dir"

  cp ./components.json "$target_dir"
  write_standalone_configs "$target_dir"

  mkdir "$target_dir/src"
  cp ./src/index.css "$target_dir/src"
}

echo "Building registry"
pnpm run registry:build

echo "Serving registry locally on port 8080"
python3 -m http.server -d ./dist 8080 &
SERVER_PID=$!

echo "Creating standalone consumer Vite app in a temp folder"
setup_temp_app ./temp
cd ./temp

echo "Configuring the @chelone registry alias to the local server"
node -e "const fs=require('fs');const p='./components.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.registries={...(j.registries||{}),'@chelone':'http://localhost:8080/r/{name}.json'};fs.writeFileSync(p,JSON.stringify(j,null,2));"

echo "Adding admin registry component"
pnpm dlx "shadcn@${SHADCN_VERSION}" add -y "http://localhost:8080/r/admin.json"

echo "Installing dependencies (needs published @chelone/core + @chelone/react)"
pnpm install

echo "Building generated consumer app"
pnpm run build

cd ..

echo "Stopping registry server"
kill "$SERVER_PID"
SERVER_PID=""

echo "All done!"
