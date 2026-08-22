// One-off migration: existing accounts (public.users_legacy, bigint-keyed, NextAuth-era)
// -> Supabase Auth (auth.users, uuid-keyed) + a personal workspace each + workspace_id
// backfilled onto their existing categories/clusters/tasks/milestones.
//
// Run once, after applying src/supabase/migrations/20260815000000_workspaces_and_supabase_auth.sql
// and before dropping users_legacy / the old user_id columns (see that migration's final
// comment block for the cleanup SQL to run afterward).
//
// Passwords are NOT carried over — bcrypt hashes aren't portable into Supabase's own
// hashing. Every migrated account needs one "Forgot password" round-trip after this runs;
// the existing OTP-based reset screen handles that unchanged.
//
//   node --env-file=.env.local --experimental-strip-types scripts/migrate-users-to-supabase-auth.ts
// (or: npx tsx --env-file=.env.local scripts/migrate-users-to-supabase-auth.ts)

import { db } from "../src/lib/db";
import { createDefaultWorkspace } from "../src/lib/services/workspace";

interface LegacyUser {
  id: number;
  email: string;
}

async function main() {
  const { data: legacyUsers, error } = await db().from("users_legacy").select("id, email");
  if (error) throw new Error(error.message);
  if (!legacyUsers?.length) {
    console.log("No rows in users_legacy — nothing to migrate.");
    return;
  }

  console.log(`Migrating ${legacyUsers.length} account(s)...`);

  for (const legacy of legacyUsers as LegacyUser[]) {
    console.log(`\n- ${legacy.email} (legacy id ${legacy.id})`);

    const { data: created, error: createError } = await db().auth.admin.createUser({
      email: legacy.email,
      email_confirm: true,
    });
    if (createError) {
      console.error(`  ✕ auth.admin.createUser failed: ${createError.message}`);
      continue;
    }
    const newUserId = created.user.id;
    console.log(`  ✓ Supabase Auth user created: ${newUserId}`);

    const workspace = await createDefaultWorkspace(newUserId, `${legacy.email.split("@")[0]}'s Workspace`);
    console.log(`  ✓ Workspace created: ${workspace.id} (${workspace.name})`);

    for (const table of ["categories", "clusters", "tasks", "milestones"] as const) {
      const { error: backfillError, count } = await db()
        .from(table)
        .update({ workspace_id: workspace.id }, { count: "exact" })
        .eq("user_id", legacy.id);
      if (backfillError) {
        console.error(`  ✕ backfill ${table} failed: ${backfillError.message}`);
      } else {
        console.log(`  ✓ ${table}: ${count ?? 0} row(s) backfilled`);
      }
    }
  }

  console.log(
    "\nDone. Each migrated account needs a password reset (existing 'Forgot password' flow) before " +
      "they can log in. Once verified, run the cleanup SQL at the bottom of the migration file to " +
      "drop users_legacy and the old user_id columns."
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
