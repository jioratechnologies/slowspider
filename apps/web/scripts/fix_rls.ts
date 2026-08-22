import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
    RETURNS boolean AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = auth.uid()
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `)

  await prisma.$executeRawUnsafe(`
    DROP POLICY IF EXISTS "members can read membership" ON public.workspace_members;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE POLICY "members can read membership" ON public.workspace_members
      FOR SELECT USING (
        public.is_workspace_member(workspace_members.workspace_id)
      );
  `)
  
  console.log("RLS policy fixed successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
