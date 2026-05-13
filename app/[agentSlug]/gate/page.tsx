import { notFound } from "next/navigation";
import { BuyerViewport } from "@/components/shell/buyer-viewport";
import { ContactGateForm } from "@/components/gate/contact-gate-form";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

export default async function GatePage({ params }: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await params;
  const agent = await resolveAgentBySlug(agentSlug);
  if (!agent) notFound();

  return (
    <BuyerViewport>
      <ContactGateForm agent={agent} />
    </BuyerViewport>
  );
}
