import { expect, test } from "@playwright/test";

const videoUrl = "https://videos.pexels.com/video-files/7578545/7578545-uhd_1440_2732_25fps.mp4";

test("root domain starts agent setup instead of a pilot agent page", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/maya$/);
  await expect(page.getByRole("heading", { name: "Set up your personal buyer link." })).toBeVisible();
  await expect(page.getByText("/your-name", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Start setup" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "Launch your buyer link" })).toBeVisible();
});

test("agent can publish setup, receive a lead, and work it from the dashboard", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const slug = `phase2-${suffix}`;
  const email = `agent-${suffix}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  const sendMagicLink = page.getByRole("button", { name: "Send magic link" });
  await expect(sendMagicLink).toBeEnabled();
  await sendMagicLink.click();
  await page.getByRole("button", { name: "Continue setup" }).click();
  await expect(page.getByText("In 10 minutes")).toBeVisible();

  await page.request.post("/api/setup/save-draft", {
    data: {
      current_step: "link",
      data: {
        slug,
        name: "Elena Ruiz",
        market: "Denver, CO",
        headshotUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80",
        bio: "Denver buyer advisor with a practical eye for lifestyle and resale.",
        headline: "Find your Denver home with Elena.",
        subHeadline: "Shortlists, honest tradeoffs, and fast showing prep.",
        voiceNotes: "Elena is direct, warm, and specific about commute, light, and resale tradeoffs.",
        phone: "+13035550123",
        phoneVerified: true,
        email,
        neighborhoods: ["LoHi", "Wash Park", "Sloan's Lake", "RiNo"],
        listings: [
          listing("123 Maple Street", 735000, 3, 2, "LoHi", true),
          listing("41 Pearl Avenue", 680000, 3, 2.5, "Wash Park", false),
          listing("890 Lakeview Court", 825000, 4, 3, "Sloan's Lake", false)
        ]
      }
    }
  });

  await page.goto("/setup/link");
  await expect(page.getByText("Your page is live.")).toBeVisible();
  await expect(page.getByText(slug)).toBeVisible();
  await page.getByRole("button", { name: "Publish and continue" }).click();
  await expect(page.getByText("Here's what your first lead will look like.")).toBeVisible({ timeout: 15_000 });

  await page.request.post("/api/leads", {
    data: {
      agent_slug: slug,
      session_id: `session-${suffix}`,
      first_name: "Alex",
      phone: "(303) 555-0199",
      email: "alex@example.com",
      preferences: {
        answered_question_ids: ["timeline", "free_text"],
        timeline: { preset: "60_days" },
        budget_min: 650000,
        budget_max: 850000,
        bedrooms: "3",
        neighborhoods: ["LoHi"],
        must_haves: ["yard", "home_office"],
        source: "instagram_bio"
      },
      free_text_raw: "Need a 3BR near LoHi with a small yard and office, hoping to move in about two months."
    }
  });

  await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready");
  await expect(page.getByRole("heading", { name: "Alex looking in Denver, CO" })).toBeVisible();
  await expect(page.getByText(/Need a 3BR|Denver/i).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Contacted", exact: true }).click();
  await expect(page.getByText("Marked contacted")).toBeVisible();

  await page.goto("/dashboard/distribution", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Universal link")).toBeVisible();
  await expect(page.getByText("Instagram bio")).toBeVisible();

  await page.goto("/dashboard/listings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("123 Maple Street")).toBeVisible();
});

function listing(address: string, price: number, beds: number, baths: number, neighborhood: string, isPocket: boolean) {
  return {
    address,
    price,
    beds,
    baths,
    sqft: 1800,
    neighborhood,
    property_type: "house",
    features: ["yard", "home_office"],
    dealBreakerFlags: [],
    videoUrl,
    videoSource: "mp4",
    agent_note: "Easy to show, strong layout, and the tradeoffs are straightforward.",
    description: `${neighborhood} home with useful space and a realistic price.`,
    isPocket
  };
}
