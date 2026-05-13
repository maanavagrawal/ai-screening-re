import { onboardAgent } from "@/lib/onboard-agent";
import { PILOT_AGENTS } from "@/lib/pilot-agents";

for (const payload of PILOT_AGENTS) {
  const agent = await onboardAgent(payload);
  console.log(`Seeded ${agent.name} at /${agent.slug}`);
}
