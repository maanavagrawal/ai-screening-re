import { RootRoleEntry } from "@/components/root/root-role-entry";
import { getAuthenticatedAgent } from "@/lib/auth/session";

export default async function Home() {
  const agent = await getAuthenticatedAgent();

  return (
    <main className="min-h-svh">
      <RootRoleEntry signedInAgent={agent ? { name: agent.name, slug: agent.slug } : null} />
    </main>
  );
}
