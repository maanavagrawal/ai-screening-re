import { notFound } from "next/navigation";
import { BuyerViewport } from "@/components/shell/buyer-viewport";
import { SellerInquiryForm } from "@/components/seller/seller-inquiry-form";
import { resolveAgentBySlug } from "@/lib/resolve-agent";

export default async function SellerPage({ params }: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await params;
  const agent = await resolveAgentBySlug(agentSlug);
  if (!agent) notFound();

  return (
    <BuyerViewport>
      <SellerInquiryForm
        agent={{
          slug: agent.slug,
          name: agent.name,
          market: agent.market,
          email: agent.email
        }}
      />
    </BuyerViewport>
  );
}
