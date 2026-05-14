import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth/session";
import { agentBaseUrl } from "@/lib/dashboard/client-utils";
import { getDistributionData } from "@/lib/dashboard/distribution";
import { getLeadsForAgent } from "@/lib/leads";
import { getPublicOriginFromRequest } from "@/lib/public-origin";
import { qrDataUrl } from "@/lib/qr";

export async function GET(request: Request) {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const leads = await getLeadsForAgent(agent.id);
  const origin = getPublicOriginFromRequest(request) ?? undefined;
  const url = agentBaseUrl(agent, origin);
  const data = await getDistributionData(agent, leads, origin);
  return NextResponse.json({
    url,
    qr: await qrDataUrl(url, 1024),
    utmLinks: {
      instagram_bio: `${url}?src=instagram_bio`,
      tiktok_bio: `${url}?src=tiktok_bio`,
      signature: `${url}?src=signature`,
      qr_code: `${url}?src=qr_code`
    },
    ...data
  });
}
