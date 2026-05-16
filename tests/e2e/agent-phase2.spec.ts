import { expect, test } from "@playwright/test";

const videoUrl = "https://videos.pexels.com/video-files/7578545/7578545-uhd_1440_2732_25fps.mp4";

test("root domain routes buyers, sellers, and agents by intent", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/maya$/);
  await expect(page.getByRole("heading", { name: "What are you here to do?" })).toBeVisible();

  await page.getByRole("button", { name: /Buy a home/ }).click();
  await page.getByLabel("Agent link or code").fill("maya");
  await page.getByRole("button", { name: "Check link" }).click();
  await page.getByRole("link", { name: "Continue to Maya Chen" }).click();
  await expect(page).toHaveURL(/\/maya$/);

  await page.goto("/");
  await page.getByRole("button", { name: /Sell a home/ }).click();
  await page.getByLabel("Agent link or code").fill("/maya");
  await page.getByRole("button", { name: "Check link" }).click();
  await page.getByRole("link", { name: "Continue to Maya Chen" }).click();
  await expect(page).toHaveURL(/\/maya\/seller$/);

  await page.goto("/");
  await page.getByRole("button", { name: /I am an agent/ }).click();
  await expect(page.getByRole("heading", { name: "Sign in or create your agent link" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: /Buy a home/ }).click();
  await page.getByLabel("Agent link or code").fill("/dashboard");
  await page.getByRole("button", { name: "Check link" }).click();
  await expect(page.getByText("We could not find that agent link.")).toBeVisible();
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
  await page.getByRole("button", { name: "Continue" }).click();
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
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready");
  await expect(page.getByText("123 Maple Street")).toBeVisible();
  const managedAddress = `24 ${suffix} Listing Lane`;
  await page.getByLabel("Address").fill(managedAddress);
  await page.getByLabel("Price").fill("765000");
  await page.getByLabel("Beds").fill("4");
  await page.getByLabel("Baths").fill("3");
  await page.getByLabel("Sqft").fill("2100");
  await page.getByLabel("Neighborhood").fill("Berkeley");
  await page.getByLabel("Property type").fill("house");
  await page.getByLabel("Features").fill("yard, home office");
  await page.getByLabel("Agent note").fill("Fresh dashboard-managed listing.");
  await page.getByRole("button", { name: "Add listing" }).click();
  const managedCard = page.locator("article").filter({ hasText: managedAddress });
  await expect(managedCard).toBeVisible();
  await managedCard.getByRole("button", { name: "Edit listing" }).click();
  const editCard = page.locator("article").filter({ has: page.getByRole("button", { name: "Save listing" }) });
  await expect(editCard.getByRole("heading", { name: "Edit listing" })).toBeVisible();
  await editCard.getByLabel("Price").fill("795000");
  await editCard.getByLabel("Neighborhood").fill("Sunnyside");
  await editCard.getByLabel("Agent note").fill("Updated from the dashboard.");
  await editCard.getByRole("button", { name: "Save listing" }).click();
  const updatedCard = page.locator("article").filter({ hasText: managedAddress });
  await expect(updatedCard.getByText("$795k")).toBeVisible();
  await expect(updatedCard.getByText("Updated from the dashboard.")).toBeVisible();
  await updatedCard.getByRole("button", { name: "Delete listing" }).click();
  await updatedCard.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText(managedAddress)).not.toBeVisible();

  await page.goto(`/${slug}/seller`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seller-form-ready")).toHaveText("ready");
  await page.getByLabel("First name").fill("Riley");
  await page.getByLabel("Phone").fill("(303) 555-0188");
  await page.getByLabel("Email").fill("riley@example.com");
  await page.getByLabel("Property address").fill("55 Seller Lane");
  await page.getByLabel("Notes").fill("Trying to understand prep before listing.");
  const sellerResponse = page.waitForResponse((response) =>
    response.url().includes("/api/seller-leads")
  );
  await page.getByRole("button", { name: "Send to agent" }).click();
  expect((await sellerResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { name: `Sent to Elena Ruiz.` })).toBeVisible();

  await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready");
  await page.getByPlaceholder("Search leads").fill("Riley");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Riley seller/ })).toBeVisible();
  await expect(page.getByText("seller").first()).toBeVisible();
  await expect(page.getByText("Property: 55 Seller Lane")).toBeVisible();
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
