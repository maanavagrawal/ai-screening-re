import { expect, test, type Page } from "@playwright/test";

const MAYA_EXACT_ADDRESSES = [
  "1811 Willow Creek Drive",
  "5204 Berkman Terrace",
  "404 E 45th Street",
  "2109 Bluebonnet Lane",
  "1312 Travis Heights Boulevard"
];

const DAVID_EXACT_ADDRESSES = [
  "1421 NW 61st Street",
  "517 Galer Street",
  "812 E Pike Street"
];

async function currentHeading(page: Page) {
  return (await page.locator("main h1").first().textContent().catch(() => ""))?.trim() ?? "";
}

async function waitForIntakeReady(page: Page) {
  await expect(page.getByTestId("intake-ready")).toHaveText("ready", { timeout: 30_000 });
}

async function waitForIntakeStepToChange(page: Page, previousHeading: string) {
  await expect
    .poll(
      async () => {
        if (page.url().includes("/gate")) return true;
        return (await currentHeading(page)) !== previousHeading;
      },
      { timeout: 45_000 }
    )
    .toBe(true);
}

async function clickButtonAndWait(page: Page, name: string) {
  const heading = await currentHeading(page);
  await page.getByRole("button", { name, exact: true }).click({ force: true });
  await waitForIntakeStepToChange(page, heading);
}

async function selectChoice(page: Page, name: string) {
  await waitForIntakeReady(page);
  const target = page.getByRole("button", { name, exact: true }).first();
  await expect(target).toBeVisible();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await target.getAttribute("aria-pressed").catch(() => null)) === "true") return;
    await target.click({ force: true });
    await page.waitForTimeout(150);
  }
  await expect(target).toHaveAttribute("aria-pressed", "true", { timeout: 5_000 });
}

async function clickContinueAndWait(page: Page) {
  const heading = await currentHeading(page);
  const continueButton = page.getByRole("button", { name: /^Continue$/ }).first();
  await expect(continueButton).toBeEnabled();
  await continueButton.click({ force: true });
  await waitForIntakeStepToChange(page, heading);
}

async function answerIfVisible(page: Page, label: string) {
  const target = page.getByRole("button", { name: label, exact: true }).first();
  if (await target.isVisible().catch(() => false)) {
    if ((await target.getAttribute("aria-pressed").catch(() => null)) !== "true") {
      await target.click({ force: true });
    }
    await clickContinueAndWait(page);
    return true;
  }
  return false;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
    )
    .toBe(true);
}

async function expectNoVisibleAiBranding(page: Page) {
  await expect(page.getByText(/OpenAI|ChatGPT|Claude|Anthropic|powered by AI|AI assistant/i)).toHaveCount(0);
}

async function expectExactAddressesHidden(page: Page, addresses: string[]) {
  for (const address of addresses) {
    await expect(page.getByText(address, { exact: true })).toHaveCount(0);
  }
}

async function completeIntake(page: Page) {
  await selectChoice(page, "30 days");
  await clickContinueAndWait(page);
  await page.getByLabel("Home search notes").fill("Need 3 bedrooms in East Austin under $750k with a yard, office, and no busy street.");
  await clickContinueAndWait(page);
  await clickButtonAndWait(page, "Yes, continue");

  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    if (await page.getByText("See your matches").isVisible().catch(() => false)) break;
    if (await page.getByText("What is your current situation?").isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Renting" }).click({ force: true });
      await clickContinueAndWait(page);
      continue;
    }
    if (await page.getByText("How are you thinking about financing?").isVisible().catch(() => false)) {
      const preApproved = page.getByRole("button", { name: "Pre-approved" });
      if ((await preApproved.getAttribute("aria-pressed").catch(() => null)) !== "true") {
        await preApproved.click({ force: true });
      }
      await clickContinueAndWait(page);
      continue;
    }
    if (await answerIfVisible(page, "Renting")) continue;
    if (await answerIfVisible(page, "Pre-approved")) continue;
    if (await page.getByRole("button", { name: "I'll send it later" }).isVisible().catch(() => false)) {
      await clickButtonAndWait(page, "I'll send it later");
      continue;
    }
    if (await page.getByText("How many bedrooms?").isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "3" }).click({ force: true });
      await clickContinueAndWait(page);
      continue;
    }
    if (await page.getByText("How many bathrooms?").isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "2" }).click({ force: true });
      await clickContinueAndWait(page);
      continue;
    }
    if (await answerIfVisible(page, "Single-family")) continue;
    if (await answerIfVisible(page, "Detached house")) continue;
    if (await answerIfVisible(page, "No")) continue;
    const skip = page.getByRole("button", { name: "Skip" }).first();
    if (await skip.isVisible().catch(() => false)) {
      const heading = await currentHeading(page);
      await skip.click({ force: true });
      await waitForIntakeStepToChange(page, heading);
      continue;
    }
    const continueButton = page.getByRole("button", { name: "Continue" }).first();
    if (
      (await continueButton.isVisible().catch(() => false)) &&
      (await continueButton.isEnabled().catch(() => false))
    ) {
      await clickContinueAndWait(page);
      continue;
    }
    await page.waitForTimeout(250);
  }

  await expect(page.getByText("See your matches")).toBeVisible({ timeout: 10_000 });
}

test("Maya and David landing pages are isolated", async ({ page }) => {
  await page.goto("/maya");
  await expect(page.getByText("Maya Chen")).toBeVisible();
  await expect(page.getByText("Austin, TX", { exact: true })).toBeVisible();
  await expect(page.getByText("David Park")).toHaveCount(0);
  await expect(page.getByText("Exact address shared after showing request").first()).toBeVisible();
  await expectExactAddressesHidden(page, MAYA_EXACT_ADDRESSES);
  await expectNoVisibleAiBranding(page);
  await expectNoHorizontalOverflow(page);

  await page.goto("/david");
  await expect(page.getByText("David Park")).toBeVisible();
  await expect(page.getByText("Seattle, WA", { exact: true })).toBeVisible();
  await expect(page.getByText("Maya Chen")).toHaveCount(0);
  await expectExactAddressesHidden(page, DAVID_EXACT_ADDRESSES);
  await expectNoVisibleAiBranding(page);
  await expectNoHorizontalOverflow(page);
});

test("buyer can complete intake, see matches, and request a showing", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/maya", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Start buyer brief/ }).click();
  await completeIntake(page);

  await page.getByLabel("First name").fill("Sarah");
  await page.getByLabel("Phone").fill("(512) 555-0141");
  await page.getByLabel("Email").fill("sarah@example.com");
  const matchesResponse = page.waitForResponse((response) =>
    response.url().includes("/api/matches/") && response.status() === 200
  );
  await page.getByRole("button", { name: /Show me homes/ }).click();

  await expect(page.getByText("Maya is picking your matches...")).toBeVisible();
  const matchesPayload = JSON.stringify(await (await matchesResponse).json());
  for (const address of MAYA_EXACT_ADDRESSES) {
    expect(matchesPayload).not.toContain(address);
  }
  await expect(page).toHaveURL(/\/maya\/matches/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Your matches", exact: true })).toBeVisible({ timeout: 15_000 });
  const recommendedTab = page.getByRole("tab", { name: /Recommended/ });
  const allTab = page.getByRole("tab", { name: /All/ });
  await expect(recommendedTab).toBeVisible();
  await expect(allTab).toBeVisible();
  await expect(recommendedTab).toHaveAttribute("aria-selected", "true");
  await allTab.click();
  await expect(allTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#matches-all")).toBeVisible();
  await recommendedTab.click();
  await expect(page.getByText("Exact address shared after showing request").first()).toBeVisible();
  await expectExactAddressesHidden(page, MAYA_EXACT_ADDRESSES);
  await expectNoVisibleAiBranding(page);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Request a showing" }).first().click();
  await expect(page.getByText("Quick check before scheduling")).toBeVisible();
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByLabel("Verification code")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.getByText("When works for you?")).toBeVisible({ timeout: 15_000 });
});

async function advanceToPropertyCategory(page: Page) {
  await page.goto("/maya/intake?start_over=1", { waitUntil: "domcontentloaded" });
  await selectChoice(page, "30 days");
  await clickContinueAndWait(page);
  await page.getByLabel("Home search notes").fill("I am still comparing options and want to talk through property fit.");
  await clickContinueAndWait(page);
  await clickButtonAndWait(page, "Yes, continue");

  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    if (await page.getByText("Do you want single-family, multifamily, or both?").isVisible().catch(() => false)) return;
    if (await answerIfVisible(page, "Renting")) continue;
    if (await answerIfVisible(page, "Pre-approved")) continue;
    if (await page.getByRole("button", { name: "I'll send it later" }).isVisible().catch(() => false)) {
      await clickButtonAndWait(page, "I'll send it later");
      continue;
    }
    if (await page.getByText("What budget range feels right?").isVisible().catch(() => false)) {
      await clickContinueAndWait(page);
      continue;
    }
    if (await page.getByText("How many bedrooms?").isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "3", exact: true }).click({ force: true });
      await clickContinueAndWait(page);
      continue;
    }
    await page.waitForTimeout(250);
  }

  throw new Error("Timed out waiting for property category question.");
}

test("buyer property category can branch through both detail paths", async ({ page }) => {
  test.setTimeout(120_000);
  await advanceToPropertyCategory(page);

  await selectChoice(page, "Both");
  await clickContinueAndWait(page);
  await expect(page.getByText("Which single-family types should we include?")).toBeVisible();
  await selectChoice(page, "Detached house");
  await clickContinueAndWait(page);
  await expect(page.getByText("Which multifamily types should we include?")).toBeVisible();
  await selectChoice(page, "Fourplex / quadplex");
  const continueButton = page.getByRole("button", { name: /^Continue$/ }).first();
  await expect(continueButton).toBeEnabled();
  await continueButton.click({ force: true });
  await expect
    .poll(
      async () =>
        (await page.getByText("Where should we look?").isVisible().catch(() => false)) ||
        (await page.getByText("See your matches").isVisible().catch(() => false)) ||
        page.url().includes("/gate"),
      { timeout: 45_000 }
    )
    .toBe(true);
});

test("structured intake Continue advances without next-question request", async ({ page }) => {
  test.setTimeout(60_000);
  let nextQuestionRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/intake/next")) nextQuestionRequests += 1;
  });

  await page.goto("/maya/intake?start_over=1", { waitUntil: "domcontentloaded" });
  await selectChoice(page, "30 days");
  const started = Date.now();
  await clickContinueAndWait(page);

  await expect(page.getByText("In your words")).toBeVisible();
  expect(Date.now() - started).toBeLessThan(1_500);
  expect(nextQuestionRequests).toBe(0);
});

test("/agents is not a directory page", async ({ page }) => {
  await page.goto("/agents");
  await expect(page.getByText("This link is not active.")).toBeVisible();
});
