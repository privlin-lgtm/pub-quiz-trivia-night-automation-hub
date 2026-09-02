import { test, expect, request } from "@playwright/test";

test("host runs a live round and a team answers correctly", async ({ browser, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const seedRes = await api.post("/api/packs/seed");
  expect(seedRes.ok()).toBeTruthy();
  const { pack } = await seedRes.json();

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto(`/packs/${pack.id}`);
  await hostPage.getByRole("button", { name: "Start live session" }).click();
  await hostPage.waitForURL(/\/host\//);
  const code = hostPage.url().split("/host/")[1];
  expect(code).toMatch(/^[A-Z0-9]{5}$/);

  const teamContext = await browser.newContext();
  const teamPage = await teamContext.newPage();
  await teamPage.goto("/play");
  await teamPage.getByLabel("Session code").fill(code);
  await teamPage.getByLabel("Team name").fill("Quiz Pigs");
  await teamPage.getByRole("button", { name: "Join session" }).click();
  await expect(teamPage.getByText("Sit tight.")).toBeVisible();

  // Host sees the team arrive via polling, then starts the quiz.
  await expect(hostPage.getByRole("button", { name: "Start quiz" })).toBeEnabled({ timeout: 10_000 });
  await hostPage.getByRole("button", { name: "Start quiz" }).click();
  await expect(hostPage.getByText("What is the capital of Australia?")).toBeVisible();

  // Team receives the question via polling and submits the correct answer.
  await expect(teamPage.getByText("What is the capital of Australia?")).toBeVisible({ timeout: 10_000 });
  await teamPage.getByLabel("Your answer").fill("Canberra");
  await teamPage.getByRole("button", { name: "Submit answer" }).click();

  // Host sees the live submission, auto-scored as correct, before revealing.
  await expect(hostPage.getByText("1/1")).toBeVisible({ timeout: 10_000 });
  await expect(hostPage.getByText("Canberra")).toBeVisible();

  await hostPage.getByRole("button", { name: "Reveal answer" }).click();

  // Team sees the reveal with their own answer and the correct verdict.
  await expect(teamPage.getByText(/Correct/)).toBeVisible({ timeout: 10_000 });
  await expect(teamPage.getByText("You said: Canberra")).toBeVisible();
  await expect(teamPage.getByText("Answer: Canberra")).toBeVisible();

  // Scoreboard (an <ol>, distinct from the <ul> submissions list) reflects the point on both sides.
  const hostScoreRow = hostPage.locator("ol").getByRole("listitem").filter({ hasText: "Quiz Pigs" });
  await expect(hostScoreRow).toContainText("1");
  const teamScoreRow = teamPage.locator("ol").getByRole("listitem").filter({ hasText: "Quiz Pigs" });
  await expect(teamScoreRow).toContainText("1");

  await hostContext.close();
  await teamContext.close();
  await api.dispose();
});
