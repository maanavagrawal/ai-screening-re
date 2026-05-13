import { notFound } from "next/navigation";
import { IntakeFlow } from "@/components/intake/intake-flow";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

export default async function IntakePage({ params }: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await params;
  const agent = await resolveAgentBySlug(agentSlug);
  if (!agent) notFound();
  return <IntakeFlow agent={agent} />;
}
