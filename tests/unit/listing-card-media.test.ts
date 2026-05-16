import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "components/matches/listing-card.tsx"), "utf8");

describe("buyer listing-card media", () => {
  it("does not use stock property image fallbacks", () => {
    expect(source).not.toContain("images.unsplash.com");
    expect(source).not.toContain("listingPosters");
    expect(source).not.toContain("posterForListing");
  });

  it("blocks known stock/demo media hosts from rendering as property media", () => {
    expect(source).toContain("isStockOrDemoMedia");
    expect(source).toContain("videos\\.pexels\\.com");
  });

  it("keeps social videos as external links instead of fake mp4 playback", () => {
    expect(source).toContain("Watch on");
    expect(source).toContain("ExternalLink");
    expect(source).toContain("listing.video_source === \"mp4\"");
  });
});
