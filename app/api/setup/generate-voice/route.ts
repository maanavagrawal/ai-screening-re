import { NextResponse } from "next/server";
import { z } from "zod";
import { generateVoice } from "@/lib/ai/anthropic";
import { parseJsonBody } from "@/lib/api/validation";
import { getCurrentUserId } from "@/lib/auth/session";
import { saveSetupDraft } from "@/lib/setup/drafts";

const BodySchema = z.object({
  raw_text: z.string().min(20),
  market: z.string().min(2)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseJsonBody(request, BodySchema);
  if ("response" in parsed) return parsed.response;

  const voice = await generateVoice({
    rawText: parsed.data.raw_text,
    market: parsed.data.market
  });

  await saveSetupDraft({
    userId,
    currentStep: "voice",
    data: {
      voiceRaw: parsed.data.raw_text,
      bio: voice.bio,
      headline: voice.headline,
      subHeadline: voice.sub_headline,
      voiceNotes: voice.voice_notes
    }
  });

  return NextResponse.json({ voice });
}

