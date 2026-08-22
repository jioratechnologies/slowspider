# Build context is the repo root (see docker-compose.yml's `build.context: .`), not this
# directory — apps/backend now depends on packages/shared-types as a real npm-workspaces
# package (see docs/MIGRATION-PLAN-bff-kong-split.md's shared-types note), and Docker can't
# COPY anything from outside its build context, so a context scoped to apps/backend alone
# can no longer reach ../../packages/shared-types.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-types packages/shared-types
COPY apps/backend apps/backend
# --workspace scopes npm to just these two — apps/web's own package.json isn't even present
# in this build context (see root .dockerignore), and npm tolerates a workspace listed in the
# root package.json that isn't actually checked out as long as it's not named in --workspace.
# The root "postinstall" script builds packages/shared-types's dist/ (plain CommonJS + .d.ts)
# right after install: node:22-slim has no built-in TypeScript support, so apps/backend
# (plain `nest build` + `node dist/main.js`, no bundler) can't `require()` shared-types' raw
# .ts source directly the way apps/web's Turbopack build or apps/mobile's Metro/Babel build
# can — those inline-compile any .ts reachable from their module graph; a plain Node runtime
# does not.
RUN npm install --workspace=apps/backend --workspace=packages/shared-types
RUN npm run build -w apps/backend

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
# --ignore-scripts: this stage only needs packages/shared-types's already-built dist/ (copied
# below from the build stage) — skips re-running the postinstall build, which would fail here
# anyway since --omit=dev drops the "typescript" devDependency it needs.
RUN npm install --omit=dev --ignore-scripts --workspace=apps/backend --workspace=packages/shared-types
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
EXPOSE 3001
CMD ["node", "apps/backend/dist/main.js"]
