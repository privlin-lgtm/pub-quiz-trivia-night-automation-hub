import { test, expect, request } from "@playwright/test";

// The tie-safe naming logic (topScorers/winningNames) is unit tested at the
// function level in src/lib/scoreboard-summary.test.ts, but nothing before
// this exercised it through the actual ENDED screen with two real teams
// genuinely tied for first — this closes that gap.
test("two teams tied for first both see the champions treatment, named together", async ({
  browser,
  baseURL,
}) => {
  const api = await request.newContext({ baseURL });
  const seedRes = await api.post("/api/packs/seed");
  const { pack } = await seedRes.json();

  const sessionRes = await api.post("/api/sessions", { data: { packId: pack.id } });
  const { session, hostToken } = await sessionRes.json();
  const code = session.code;

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.addInitScript(
    ({ code, hostToken }) => {
      localStorage.setItem("quiz-hub:host-tokens", JSON.stringify({ [code]: hostToken }));
    },
    { code, hostToken }
  );
  await hostPage.goto(`/host/${code}`);

  const teamAContext = await browser.newContext();
  const teamA = await teamAContext.newPage();
  await teamA.goto("/play");
  await teamA.getByLabel("Session code").fill(code);
  await teamA.getByLabel("Team name").fill("Quiz Pigs");
  await teamA.getByRole("button", { name: "Join session" }).click();
  await teamA.getByText("Sit tight.").waitFor();

  const teamBContext = await browser.newContext();
  const teamB = await teamBContext.newPage();
  await teamB.goto("/play");
  await teamB.getByLabel("Session code").fill(code);
  await teamB.getByLabel("Team name").fill("Trivia Titans");
  await teamB.getByRole("button", { name: "Join session" }).click();
  await teamB.getByText("Sit tight.").waitFor();

  await hostPage.getByRole("button", { name: "Start quiz" }).click();

  // Both teams answer every question correctly, so they stay tied all the
  // way to the end rather than just tying on question one.
  for (let i = 0; i < 6; i++) {
    await teamA.getByLabel("Your answer").waitFor({ timeout: 10_000 });
    const question = await teamA.locator("h2").last().textContent();
    const answer = ANSWERS[question?.trim() ?? ""];
    if (!answer) throw new Error(`No known answer for question: ${question}`);

    await teamA.getByLabel("Your answer").fill(answer);
    await teamA.getByRole("button", { name: "Submit answer" }).click();
    await teamB.getByLabel("Your answer").fill(answer);
    await teamB.getByRole("button", { name: "Submit answer" }).click();

    await hostPage.getByText("2/2").waitFor({ timeout: 10_000 });
    await hostPage.getByRole("button", { name: "Reveal answer" }).click();
    await hostPage.getByRole("button", { name: /Next question|End quiz/ }).click();
  }

  await expect(hostPage.getByText("Tonight’s champions")).toBeVisible({ timeout: 10_000 });
  await expect(hostPage.getByRole("heading", { name: "Quiz Pigs & Trivia Titans" })).toBeVisible();

  await expect(teamA.getByText("You tied for the win!")).toBeVisible({ timeout: 10_000 });
  await expect(teamA.getByRole("heading", { name: "Champions, Quiz Pigs!" })).toBeVisible();

  await expect(teamB.getByText("You tied for the win!")).toBeVisible({ timeout: 10_000 });
  await expect(teamB.getByRole("heading", { name: "Champions, Trivia Titans!" })).toBeVisible();

  await hostContext.close();
  await teamAContext.close();
  await teamBContext.close();
  await api.dispose();
});

const ANSWERS: Record<string, string> = {
  "What is the capital of Australia?": "Canberra",
  "How many continents are there?": "Seven",
  "What planet is known as the Red Planet?": "Mars",
  "Who played Jack in the 1997 film Titanic?": "Leonardo DiCaprio",
  "What was the best-selling console of the 1990s?": "Sony PlayStation",
  "Which British girl group released 'Wannabe' in 1996?": "Spice Girls",
};
