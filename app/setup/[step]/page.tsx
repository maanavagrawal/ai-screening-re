import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { getCurrentUserId } from "@/lib/auth/session";
import { getSetupDraft } from "@/lib/setup/drafts";

const allowedSteps = new Set(["welcome", "basics", "voice", "listings", "neighborhoods", "phone", "link", "simulation"]);

export default async function SetupStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!allowedSteps.has(step)) redirect("/setup/welcome");

  const userId = await getCurrentUserId();
  if (!userId) redirect("/signup");
  const draft = await getSetupDraft(userId);

  return <SetupWizard step={step as never} initialDraft={draft?.data ?? { userId }} />;
}

