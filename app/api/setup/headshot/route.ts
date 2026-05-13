import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUserId } from "@/lib/auth/session";
import { saveSetupDraft } from "@/lib/setup/drafts";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Headshot file is required" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 86 })
    .toBuffer();

  const supabase = getServiceSupabase();
  let url = `data:image/jpeg;base64,${output.toString("base64")}`;

  if (supabase) {
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("headshots").upload(path, output, {
      contentType: "image/jpeg",
      upsert: true
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data } = supabase.storage.from("headshots").getPublicUrl(path);
    url = data.publicUrl;
  }

  await saveSetupDraft({ userId, currentStep: "basics", data: { headshotUrl: url } });
  return NextResponse.json({ url });
}

