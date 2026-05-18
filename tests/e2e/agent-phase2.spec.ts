import { expect, test } from "@playwright/test";

const videoUrl = "https://videos.pexels.com/video-files/7578545/7578545-uhd_1440_2732_25fps.mp4";

test("root domain prioritizes agent signup", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("root-ready")).toHaveText("ready");
  await expect(page).not.toHaveURL(/\/maya$/);
  await expect(page.getByRole("heading", { name: "Private agent links for serious real estate leads." })).toBeVisible();
  await expect(page.getByText("Agent client links")).toBeVisible();

  await page.getByRole("link", { name: "Get your private link" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "Sign in or create your agent link" })).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("root-ready")).toHaveText("ready");
  await page.getByRole("link", { name: "Sign in or create link" }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("setup basics market field suggests cities while typing", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const suggestionBodies: Array<{ query?: string; scope?: string }> = [];
  const marketSaves: string[] = [];

  await page.goto("/signup");
  await page.getByLabel("Email").fill(`setup-market-${suffix}@example.com`);
  await page.getByRole("button", { name: "Send secure sign-in link" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("In 10 minutes")).toBeVisible();

  await page.route("**/api/setup/location-suggestions", async (route) => {
    const body = route.request().postDataJSON() as { query?: string; scope?: string };
    suggestionBodies.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            label: "San Ramon",
            placeId: `market-place-${suffix}`,
            source: "google_places",
            type: "city",
            parentLabel: "California, USA"
          },
          {
            label: "San Jose",
            placeId: `market-place-san-jose-${suffix}`,
            source: "google_places",
            type: "city",
            parentLabel: "California, USA"
          }
        ]
      })
    });
  });
  await page.route("**/api/setup/save-draft", async (route) => {
    const body = route.request().postDataJSON() as { data?: { market?: string } };
    if (body.data?.market !== undefined) marketSaves.push(body.data.market);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto("/setup/basics", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("setup-ready")).toHaveText("ready", { timeout: 30_000 });
  const marketInput = page.getByLabel("Market");
  await marketInput.fill("San");
  await expect(page.getByRole("option", { name: /San Ramon/ })).toBeVisible();
  expect(suggestionBodies.at(-1)).toMatchObject({ query: "San", scope: "market" });
  await page.getByRole("option", { name: /San Ramon/ }).click();

  await expect(marketInput).toHaveValue("San Ramon, California, USA");
  await expect.poll(() => marketSaves.at(-1)).toBe("San Ramon, California, USA");
});

test("setup listing entry starts with address lookup and reveals details", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const managedAddress = `120 ${suffix} Larch Road`;
  const suggestedAddress = `${managedAddress}, San Ramon, CA 94582`;
  const replacementAddress = `88 ${suffix} Cedar Road`;
  const replacementSuggestedAddress = `${replacementAddress}, Oakland, CA 94610`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(`setup-listing-${suffix}@example.com`);
  await page.getByRole("button", { name: "Send secure sign-in link" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("In 10 minutes")).toBeVisible();

  await page.route("**/api/listing-address-suggestions", async (route) => {
    const body = route.request().postDataJSON() as { query?: string };
    const query = body.query?.toLowerCase() ?? "";
    const useReplacement = query.includes("cedar") || query.startsWith("88 ");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          useReplacement
            ? {
                label: replacementSuggestedAddress,
                placeId: `replacement-place-${suffix}`,
                secondaryLabel: "Oakland, CA 94610",
                source: "google_places"
              }
            : {
                label: suggestedAddress,
                placeId: `setup-place-${suffix}`,
                secondaryLabel: "San Ramon, CA 94582",
                source: "google_places"
              }
        ]
      })
    });
  });
  const propertySearchBodies: Array<{ address?: string; placeId?: string }> = [];
  await page.route("**/api/listing-property-search", async (route) => {
    const body = route.request().postDataJSON() as { address?: string; placeId?: string };
    propertySearchBodies.push(body);
    if (body.address?.includes("Fail")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            attomId: null,
            propertyDataSource: "manual",
            propertyEnrichedAt: "2026-05-16T00:00:00.000Z",
            propertyMatchConfidence: 0.3,
            normalizedAddress: {
              line1: "500 Fail Lane",
              city: null,
              state: null,
              postalCode: null,
              label: "500 Fail Lane"
            },
            propertyFacts: {},
            message: "ATTOM could not read that address. Select a full street address from the dropdown with city, state, and ZIP, or fill the details manually below."
          }
        })
      });
      return;
    }
    if (body.address?.includes(replacementAddress)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            attomId: `replacement-attom-${suffix}`,
            propertyDataSource: "attom",
            propertyEnrichedAt: "2026-05-16T00:00:00.000Z",
            propertyMatchConfidence: 0.91,
            normalizedAddress: {
              line1: replacementAddress,
              city: "Oakland",
              state: "CA",
              postalCode: "94610",
              label: replacementSuggestedAddress
            },
            propertyFacts: {
              beds: 2,
              baths: 1,
              sqft: 1110,
              propertyType: "Condominium",
              yearBuilt: 2008
            },
            message: "Property facts found."
          }
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          attomId: `setup-attom-${suffix}`,
          propertyDataSource: "attom",
          propertyEnrichedAt: "2026-05-16T00:00:00.000Z",
          propertyMatchConfidence: 0.94,
          normalizedAddress: {
            line1: managedAddress,
            city: "San Ramon",
            state: "CA",
            postalCode: "94582",
            label: suggestedAddress
          },
          propertyFacts: {
            beds: 4,
            baths: 3,
            sqft: 2650,
            propertyType: "Single Family Residence",
            yearBuilt: 2019
          },
          message: "Property facts found."
        }
      })
    });
  });
  const releaseSlowExtraction: { current: (() => void) | null } = { current: null };
  let slowExtractionFinished = false;
  await page.route("**/api/setup/extract-listing-details", async (route) => {
    const body = route.request().postDataJSON() as { text?: string };
    if (body.text?.includes("Slow Removed")) {
      await new Promise<void>((resolve) => {
        releaseSlowExtraction.current = resolve;
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          details: {
            address: "700 Slow Removed Lane",
            price: 825000,
            beds: 2,
            baths: 2,
            sqft: 1200,
            neighborhood: "Oakland",
            property_type: "condo",
            confidence: 0.9
          }
        })
      });
      slowExtractionFinished = true;
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        details: {
          address: "500 Fail Lane",
          price: 910000,
          beds: 3,
          baths: 2,
          sqft: 1840,
          neighborhood: "San Ramon",
          property_type: "house",
          features: ["yard"],
          dealBreakerFlags: ["busy street"],
          agent_note: "Good layout once you get past the street noise.",
          confidence: 0.82
        }
      })
    });
  });
  type SavedListing = { sourceText?: string; videoSource?: string | null; videoUrl?: string | null };
  const listingSaveBodies: Array<{ data?: { listings?: SavedListing[] } }> = [];
  await page.route("**/api/setup/save-draft", async (route) => {
    const body = route.request().postDataJSON() as { data?: { listings?: SavedListing[] } };
    if (Array.isArray(body?.data?.listings)) listingSaveBodies.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto("/setup/listings", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("setup-ready")).toHaveText("ready", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Add listings." })).toBeVisible();
  await expect(page.getByText("Start with the first address.")).toBeVisible();
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeDisabled();
  await page.getByRole("button", { name: "Add listing" }).click();
  await expect(page.getByLabel("Listing 1 details")).not.toBeVisible();

  const propertyFacts = page.getByLabel("Listing 1 property facts");
  await propertyFacts.getByLabel("Address").fill(managedAddress.slice(0, 8));
  await expect(page.getByRole("option", { name: new RegExp(managedAddress) })).toBeVisible();
  await page.getByRole("option", { name: new RegExp(managedAddress) }).click();

  await expect(propertyFacts.getByText("Property facts added")).toBeVisible({ timeout: 15_000 });
  expect(propertySearchBodies[0]).toMatchObject({
    address: suggestedAddress,
    placeId: `setup-place-${suffix}`
  });
  const details = page.getByLabel("Listing 1 details");
  await expect(details).toBeVisible();
  await expect(details.getByLabel("Neighborhood")).toHaveValue("San Ramon");
  await expect(details.getByLabel("Beds")).toHaveValue("4");
  await expect(details.getByLabel("Baths")).toHaveValue("3");
  await expect(details.getByLabel("Sqft")).toHaveValue("2650");
  await expect(details.getByLabel("Property type")).toHaveValue("house");
  await expect(page.getByText("Optional media link")).not.toBeVisible();
  await expect(page.getByLabel("Listing 1 autofill from text")).not.toBeVisible();
  await expect(continueButton).toBeDisabled();
  await details.getByLabel("Price").fill("1200000");
  await details.getByLabel("Video URL").fill("https://www.instagram.com/p/setup-video/");
  await expect.poll(() => {
    const latest = listingSaveBodies[listingSaveBodies.length - 1]?.data?.listings?.[0];
    return latest?.videoSource;
  }).toBe("instagram");
  await expect(continueButton).toBeEnabled();

  await propertyFacts.getByLabel("Address").fill(replacementAddress);
  await expect(details.getByLabel("Price")).toHaveValue("");
  await expect(details.getByLabel("Neighborhood")).toHaveValue("");
  await expect(details.getByLabel("Beds")).toHaveValue("");
  await expect(details.getByLabel("Baths")).toHaveValue("");
  await expect(details.getByLabel("Sqft")).toHaveValue("");
  await expect(details.getByLabel("Property type")).toHaveValue("");
  await expect(continueButton).toBeDisabled();
  await expect(page.getByRole("option", { name: new RegExp(replacementAddress) })).toBeVisible();
  await page.getByRole("option", { name: new RegExp(replacementAddress) }).click();

  await expect(propertyFacts.getByText("Property facts added")).toBeVisible({ timeout: 15_000 });
  expect(propertySearchBodies.at(-1)).toMatchObject({
    address: replacementSuggestedAddress,
    placeId: `replacement-place-${suffix}`
  });
  await expect(details.getByLabel("Price")).toHaveValue("");
  await expect(details.getByLabel("Neighborhood")).toHaveValue("Oakland");
  await expect(details.getByLabel("Beds")).toHaveValue("2");
  await expect(details.getByLabel("Baths")).toHaveValue("1");
  await expect(details.getByLabel("Sqft")).toHaveValue("1110");
  await expect(details.getByLabel("Property type")).toHaveValue("condo");
  await expect(continueButton).toBeDisabled();
  await details.getByLabel("Price").fill("1300000");
  await expect(continueButton).toBeEnabled();

  await expect.poll(() => listingSaveBodies.length).toBeGreaterThanOrEqual(2);
  listingSaveBodies.length = 0;
  await page.getByRole("button", { name: "Collapse listing 1" }).click();
  await expect(details).not.toBeVisible();
  await page.getByRole("button", { name: "Expand listing 1" }).click();
  await expect(details).toBeVisible();

  await page.getByRole("button", { name: "Add another listing" }).click();
  const secondPropertyFacts = page.getByLabel("Listing 2 property facts");
  await secondPropertyFacts.getByLabel("Address").fill("500 Fail Lane");
  await secondPropertyFacts.getByRole("button", { name: "Lookup facts" }).click();
  await expect(secondPropertyFacts.getByText("Details needed")).toBeVisible({ timeout: 15_000 });
  await expect(secondPropertyFacts.getByText("Enter the basics below, or paste remarks to autofill.")).toBeVisible();
  await expect(secondPropertyFacts.getByText("ATTOM could not read that address")).not.toBeVisible();
  await expect(secondPropertyFacts.getByText("No structured facts found yet.")).not.toBeVisible();
  const secondAutofill = page.getByLabel("Listing 2 autofill from text");
  await expect(secondAutofill).toBeVisible();
  await secondAutofill.getByPlaceholder(/Paste remarks/).fill("500 Fail Lane, $910k, 3 bed, 2 bath, 1,840 sqft, San Ramon, yard, busy street.");
  await secondAutofill.getByRole("button", { name: "Fill fields from text" }).click();
  const secondDetails = page.getByLabel("Listing 2 details");
  await expect(secondDetails).toBeVisible();
  await expect(secondDetails.getByLabel("Price")).toHaveValue("910000");
  await expect(secondDetails.getByLabel("Neighborhood")).toHaveValue("San Ramon");
  await secondPropertyFacts.getByRole("button", { name: "Lookup facts" }).click();
  await expect(secondPropertyFacts.getByText("Details needed")).toBeVisible({ timeout: 15_000 });
  await expect(secondDetails.getByLabel("Price")).toHaveValue("910000");
  await expect(secondDetails.getByLabel("Neighborhood")).toHaveValue("San Ramon");
  await expect(secondDetails.getByLabel("Beds")).toHaveValue("3");
  await expect(secondDetails.getByLabel("Baths")).toHaveValue("2");
  await expect(secondDetails.getByLabel("Sqft")).toHaveValue("1840");
  await page.getByRole("button", { name: "Remove listing 1" }).click();
  await expect(page.getByLabel("Listing 2 property facts")).not.toBeVisible();
  await expect(page.getByLabel("Listing 1 autofill from text").getByPlaceholder(/Paste remarks/)).toHaveValue("500 Fail Lane, $910k, 3 bed, 2 bath, 1,840 sqft, San Ramon, yard, busy street.");
  await expect(page.getByLabel("Listing 1 details").getByLabel("Price")).toHaveValue("910000");
  await expect(continueButton).toBeEnabled();
  await page.getByRole("button", { name: "Add another listing" }).click();
  const transientPropertyFacts = page.getByLabel("Listing 2 property facts");
  await transientPropertyFacts.getByRole("button", { name: "Paste remarks instead" }).click();
  const transientAutofill = page.getByLabel("Listing 2 autofill from text");
  await transientAutofill.getByPlaceholder(/Paste remarks/).fill("Slow Removed Lane, $825k, 2 bed, 2 bath, 1,200 sqft, Oakland condo.");
  await transientAutofill.getByRole("button", { name: "Fill fields from text" }).click();
  await expect.poll(() => Boolean(releaseSlowExtraction.current)).toBe(true);
  await page.getByRole("button", { name: "Remove listing 2" }).click();
  releaseSlowExtraction.current?.();
  await expect.poll(() => slowExtractionFinished).toBe(true);
  await expect(page.getByLabel("Listing 2 property facts")).not.toBeVisible();
  await expect.poll(() => listingSaveBodies.at(-1)?.data?.listings?.length).toBe(1);
  expect(listingSaveBodies.length).toBeGreaterThanOrEqual(2);
});

test("setup neighborhoods autocomplete and continue after one area", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  await page.goto("/signup");
  await page.getByLabel("Email").fill(`setup-areas-${suffix}@example.com`);
  await page.getByRole("button", { name: "Send secure sign-in link" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("In 10 minutes")).toBeVisible();

  await page.request.post("/api/setup/save-draft", {
    data: {
      current_step: "neighborhoods",
      data: {
        market: "San Francisco, CA",
        listings: []
      }
    }
  });
  await page.route("**/api/setup/location-suggestions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            label: "San Ramon",
            placeId: `setup-area-${suffix}`,
            source: "google_places",
            type: "city",
            parentLabel: "California, USA"
          }
        ]
      })
    });
  });

  await page.goto("/setup/neighborhoods", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("setup-ready")).toHaveText("ready");
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeDisabled();

  await page.getByLabel("Add neighborhood").fill("San");
  await expect(page.getByRole("option", { name: /San Ramon/ })).toBeVisible();
  await page.getByRole("option", { name: /San Ramon/ }).click();

  await expect(page.getByRole("button", { name: "San Ramon" })).toBeVisible();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Where should buyer notifications go?" })).toBeVisible();
});

test("agent can publish setup, receive a lead, and work it from the dashboard", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const slug = `phase2-${suffix}`;
  const email = `agent-${suffix}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  const sendMagicLink = page.getByRole("button", { name: "Send secure sign-in link" });
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
  const publishResponse = page.waitForResponse((response) =>
    response.url().includes("/api/setup/complete") && response.request().method() === "POST",
    { timeout: 45_000 }
  );
  await page.getByRole("button", { name: "Publish and continue" }).click();
  expect((await publishResponse).status()).toBe(200);
  await expect(page.getByText("Here's what your first lead will look like.")).toBeVisible({ timeout: 30_000 });

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
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Alex looking in Denver, CO" })).toBeVisible();
  await expect(page.getByText(/Need a 3BR|Denver/i).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Contacted", exact: true }).click();
  await expect(page.getByText("Marked contacted")).toBeVisible();

  await page.goto("/dashboard/distribution", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Universal link")).toBeVisible();
  await expect(page.getByText("Instagram bio")).toBeVisible();

  await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready", { timeout: 30_000 });
  const headlineInput = page.getByLabel("Headline");
  await expect(headlineInput).toHaveValue("Find your Denver home with Elena.");
  const manualSave = page.waitForResponse((response) =>
    response.url().includes("/api/dashboard/settings") && response.request().method() === "PATCH"
  );
  await headlineInput.fill("Manual headline for Denver buyers.");
  await headlineInput.blur();
  expect((await manualSave).status()).toBe(200);
  await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 10_000 });
  await expect(headlineInput).toHaveValue("Manual headline for Denver buyers.");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText("Headline generated")).toBeVisible();
  await expect(headlineInput).toHaveValue(/Denver buyer advisor/);

  const managedAddress = `24 ${suffix} Listing Lane`;
  const suggestedManagedAddress = `${managedAddress}, Denver, CO 80211`;
  await page.route("**/api/listing-address-suggestions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            label: suggestedManagedAddress,
            placeId: `place-${suffix}`,
            secondaryLabel: "Denver, CO 80211",
            source: "google_places"
          }
        ]
      })
    });
  });
  let dashboardPropertyLookupCount = 0;
  await page.route("**/api/listing-property-search", async (route) => {
    dashboardPropertyLookupCount += 1;
    if (dashboardPropertyLookupCount > 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            attomId: null,
            propertyDataSource: "manual",
            propertyEnrichedAt: "2026-05-16T00:00:00.000Z",
            propertyMatchConfidence: 0.3,
            normalizedAddress: {
              line1: managedAddress,
              city: "Denver",
              state: "CO",
              postalCode: "80211",
              label: suggestedManagedAddress
            },
            propertyFacts: {},
            message: "No ATTOM match found. Fill the details manually below or use text autofill."
          }
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          attomId: `attom-${suffix}`,
          propertyDataSource: "attom",
          propertyEnrichedAt: "2026-05-16T00:00:00.000Z",
          propertyMatchConfidence: 0.95,
          normalizedAddress: {
            line1: managedAddress,
            city: "Denver",
            state: "CO",
            postalCode: "80211",
            label: suggestedManagedAddress
          },
          propertyFacts: {
            beds: 4,
            baths: 3,
            sqft: 2100,
            propertyType: "Single Family Residence",
            yearBuilt: 2018
          },
          message: "Property facts found."
        }
      })
    });
  });

  await page.goto("/dashboard/listings", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready", { timeout: 30_000 });
  await expect(page.getByText("123 Maple Street")).toBeVisible();
  await page.getByLabel("Address").fill(managedAddress.slice(0, 10));
  await expect(page.getByRole("option", { name: new RegExp(managedAddress) })).toBeVisible();
  await page.getByLabel("Address").press("Enter");
  await expect(page.getByText("Property facts found.")).toBeVisible();
  await expect(page.getByLabel("Address")).toHaveValue(suggestedManagedAddress);
  await expect(page.getByLabel("Beds")).toHaveValue("4");
  await expect(page.getByLabel("Baths")).toHaveValue("3");
  await expect(page.getByLabel("Sqft")).toHaveValue("2100");
  await expect(page.getByLabel("Property type")).toHaveValue("house");
  await page.getByLabel("Price").fill("765000");
  await page.getByLabel("Neighborhood").fill("Berkeley");
  await page.getByRole("button", { name: "Lookup facts" }).click();
  await expect(page.getByLabel("Price")).toHaveValue("765000");
  await expect(page.getByLabel("Neighborhood")).toHaveValue("Berkeley");
  await expect(page.getByLabel("Beds")).toHaveValue("4");
  await expect(page.getByLabel("Baths")).toHaveValue("3");
  await expect(page.getByLabel("Sqft")).toHaveValue("2100");
  await expect(page.getByLabel("Property type")).toHaveValue("house");
  await page.getByLabel("Features").fill("yard, home office");
  await page.getByLabel("Agent note").fill("Fresh dashboard-managed listing.");
  await page.getByRole("button", { name: "Add listing" }).click();
  const managedCard = page.locator("article").filter({ hasText: suggestedManagedAddress });
  await expect(managedCard).toBeVisible();
  await managedCard.getByRole("button", { name: "Edit listing" }).click();
  const editCard = page.locator("article").filter({ has: page.getByRole("button", { name: "Save listing" }) });
  await expect(editCard.getByRole("heading", { name: "Edit listing" })).toBeVisible();
  await editCard.getByLabel("Price").fill("795000");
  await editCard.getByLabel("Neighborhood").fill("Sunnyside");
  await editCard.getByLabel("Agent note").fill("Updated from the dashboard.");
  const saveListingResponse = page.waitForResponse((response) =>
    response.url().includes("/api/dashboard/listings/") && response.request().method() === "PATCH"
  );
  await editCard.getByRole("button", { name: "Save listing" }).click();
  expect((await saveListingResponse).status()).toBe(200);
  const updatedCard = page.locator("article").filter({ hasText: suggestedManagedAddress });
  await expect(updatedCard.getByText("$795k")).toBeVisible();
  await expect(updatedCard.getByText("Updated from the dashboard.")).toBeVisible();
  await updatedCard.getByRole("button", { name: "Delete listing" }).click();
  await updatedCard.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.locator("article").filter({ hasText: suggestedManagedAddress })).not.toBeVisible();

  await page.goto(`/${slug}/seller`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seller-form-ready")).toHaveText("ready", { timeout: 30_000 });
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
  await expect(page.getByTestId("dashboard-ready")).toHaveText("ready", { timeout: 30_000 });
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
