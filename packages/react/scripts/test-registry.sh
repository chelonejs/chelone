#!/bin/bash

# End-to-end registry install test — DEFERRED (not wired into CI/verify yet).
#
# ============================ READ THIS FIRST ============================
# This live E2E is BLOCKED until @chelone/core and @chelone/react are
# PUBLISHED to npm. The registry's copied component source imports those two
# packages as REAL npm dependencies (see WORKSPACE_NPM_DEPS in
# scripts/granularize-block.mjs). They are unpublished 0.0.0 workspace packages
# today, so a standalone consumer created by `shadcn add` cannot resolve them —
# `pnpm install` / `vite build` in the scratch consumer would fail on the
# missing @chelone/* deps, NOT on any registry defect.
#
# Publishing @chelone/core + @chelone/react is a USER ACTION (npm org). Once
# they are on npm, set CHELONE_REGISTRY_E2E=1 to run this script; until then it
# exits early with a reminder. This matches plan D6 (registry BUILT, live E2E
# DEFERRED — external dependency, not a P7 blocker).
#
# The `registry:generate` + `registry:build` gates (dangling-dep validator,
# basename-collision guard, per-item dist output check) DO run in verify and
# already exercise the whole pipeline short of the live consumer install.
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
[test-registry] SKIPPED — live consumer E2E is deferred.

  @chelone/core and @chelone/react are unpublished (0.0.0). The registry's
  copied source needs them as real npm deps, so a scratch consumer install
  cannot resolve them yet. Publish both to npm, then re-run with:

    CHELONE_REGISTRY_E2E=1 ./scripts/test-registry.sh

  The registry:generate + registry:build gates already validate the pipeline
  (dangling-dep + per-item dist output). See plan D6.
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
