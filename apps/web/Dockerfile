# Build context is the repo root (see docker-compose.yaml's `build.context: .`), same
# reason as apps/backend/Dockerfile: apps/web depends on packages/shared-types as a real
# npm-workspaces package, and Docker can't COPY anything from outside its build context.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm install --workspace=apps/web --workspace=packages/shared-types

# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time, not at container
# start — they must be present here, not just in the runtime stage's env_file/environment.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REALTIME_WS_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_REALTIME_WS_URL=$NEXT_PUBLIC_REALTIME_WS_URL

RUN npm run build -w apps/web

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# `output: "standalone"` (next.config.ts) traces only the deps apps/web's server actually
# needs and lays them out rooted at the workspace root — no separate `npm install` here.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
