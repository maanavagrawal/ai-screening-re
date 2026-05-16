import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUserId, setAgentSession } from "@/lib/auth/session";
import { onboardAgent } from "@/lib/onboard-agent";
import { resolveAgentBySlug } from "@/lib/resolve-agent";
import { getSetupDraft, saveSetupDraft } from "@/lib/setup/drafts";
import type { AgentSetupDraftData } from "@/lib/types";

function makePayload(data: Partial<AgentSetupDraftData>, userId: string) {
  const slug = data.slug || data.name?.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9-]/g, "");
  if (!slug) throw new Error("Slug is required");
  if (!data.name || !data.market || !data.headshotUrl || !data.phone || !data.email) {
    throw new Error("Basics, phone, and email are required");
  }
  if (!data.listings || data.listings.length < 3) {
    throw new Error("Add at least 3 listings before publishing");
  }
  const neighborhoods = data.neighborhoods?.length
    ? data.neighborhoods
    : Array.from(new Set(data.listings.map((listing) => listing.neighborhood).filter(Boolean) as string[]));
  if (neighborhoods.length < 1) throw new Error("Add at least 1 neighborhood");

  return {
    userId,
    slug,
    name: data.name,
    market: data.market,
    neighborhoods,
    headshotUrl: data.headshotUrl,
    bio: data.bio || `${data.market} buyer advisor with a clear, practical read on homes.`,
    headline: data.headline,
    subHeadline: data.subHeadline,
    voiceNotes: data.voiceNotes,
    phone: data.phone,
    email: data.email,
    accentColor: data.accentColor,
    notificationPreferences: data.notificationPreferences,
    listings: data.listings
  };
}

function setupErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (!issue) return "Some setup fields need a quick fix before publishing";
    if (issue.path[0] === "listings" && typeof issue.path[1] === "number") {
      return `Listing ${issue.path[1] + 1}: ${issue.message}`;
    }
    return issue.message;
  }
  return error instanceof Error ? error.message : "Unable to complete setup";
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const draft = await getSetupDraft(userId);
  if (!draft) return NextResponse.json({ error: "Setup draft not found" }, { status: 404 });

  try {
    const payload = makePayload(draft.data, userId);
    const existing = await resolveAgentBySlug(payload.slug);
    if (existing && existing.user_id !== userId) {
      return NextResponse.json({ error: "That link is already taken" }, { status: 409 });
    }
    const agent = await onboardAgent(payload);
    await saveSetupDraft({ userId, currentStep: "simulation", data: { userId, slug: agent.slug } });
    await setAgentSession({ userId, agentSlug: agent.slug });
    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json(
      { error: setupErrorMessage(error) },
      { status: 400 }
    );
  }
}
