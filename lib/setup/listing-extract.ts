import { z } from "zod";

export const ExtractedListingSchema = z.object({
  url: z.string().url(),
  source: z.enum(["instagram", "tiktok", "mp4", "unsupported"]),
  videoUrl: z.string().url().nullable(),
  videoSource: z.enum(["instagram", "tiktok", "mp4"]).nullable(),
  thumbnailUrl: z.string().url().nullable(),
  message: z.string(),
  requiresManualDetails: z.boolean()
});

export type ExtractedListing = z.infer<typeof ExtractedListingSchema>;

export async function extractListingFromUrl(url: string): Promise<ExtractedListing> {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const isMp4 = parsed.pathname.toLowerCase().endsWith(".mp4");

  if (isMp4) {
    return {
      url,
      source: "mp4",
      videoUrl: url,
      videoSource: "mp4",
      thumbnailUrl: null,
      message: "Video ready. Add the property details below.",
      requiresManualDetails: true
    };
  }

  if (host.includes("instagram.com") || host.includes("tiktok.com")) {
    return {
      url,
      source: host.includes("instagram.com") ? "instagram" : "tiktok",
      videoUrl: url,
      videoSource: host.includes("instagram.com") ? "instagram" : "tiktok",
      thumbnailUrl: null,
      message: "Media link added. Social posts cannot provide reliable property details, so fill those in below.",
      requiresManualDetails: true
    };
  }

  if (
    host.includes("zillow.com") ||
    host.includes("redfin.com") ||
    host.includes("realtor.com") ||
    host.includes("mls")
  ) {
    return {
      url,
      source: "unsupported",
      videoUrl: null,
      videoSource: null,
      thumbnailUrl: null,
      message: "We can't auto-import from MLS yet. Paste the details below; it takes about 20 seconds.",
      requiresManualDetails: true
    };
  }

  return {
    url,
    source: "unsupported",
    videoUrl: null,
    videoSource: null,
    thumbnailUrl: null,
    message: "Link saved as a reference. Add the property details below.",
    requiresManualDetails: true
  };
}

