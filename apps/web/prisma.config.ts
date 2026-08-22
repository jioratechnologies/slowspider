import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma's own env loading only looks at `.env`, not Next.js's `.env.local` — load it
// explicitly so `prisma migrate deploy` etc. see the same values the app does.
loadEnv({ path: ".env.local" });

// Prisma is schema/migrations only here — see prisma/schema.prisma's header for why.
// Migrate needs a direct (non-pooled) Postgres connection to run DDL reliably; Supabase's
// pooled connection string (PgBouncer, transaction mode) doesn't support that.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
});
