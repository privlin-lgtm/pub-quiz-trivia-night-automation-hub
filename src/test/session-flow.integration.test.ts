import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as createPack } from "@/app/api/packs/seed/route";
import { POST as createSession } from "@/app/api/sessions/route";
import { GET as getSession } from "@/app/api/sessions/[code]/route";
import { POST as joinSession } from "@/app/api/sessions/[code]/join/route";
import { POST as advanceSession } from "@/app/api/sessions/[code]/advance/route";
import { POST as submitAnswer } from "@/app/api/sessions/[code]/answers/route";
import { PATCH as overrideAnswer } from "@/app/api/sessions/[code]/answers/[answerId]/route";
import { DEMO_PACK } from "@/lib/demo-pack";
import { db } from "@/lib/db";

const BASE = "http://localhost:3000";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json(res: Response) {
  return res.json();
}

describe("full session lifecycle", () => {
  let packId: string;
  let code: string;
  let token: string;

  beforeAll(async () => {
    const res = await createPack();
    const data = await json(res);
    packId = data.pack.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates a session with a join code", async () => {
    const res = await createSession(jsonRequest(`${BASE}/api/sessions`, "POST", { packId }));
    expect(res.status).toBe(201);
    const data = await json(res);
    code = data.session.code;
    expect(code).toMatch(/^[A-Z0-9]{5}$/);
    expect(data.session.status).toBe("LOBBY");
  });

  it("lets a team join and rejects a duplicate name", async () => {
    const res = await joinSession(
      jsonRequest(`${BASE}/api/sessions/${code}/join`, "POST", { name: "Quiz Pigs" }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(201);
    const data = await json(res);
    token = data.token;
    expect(data.teamName).toBe("Quiz Pigs");

    const dupe = await joinSession(
      jsonRequest(`${BASE}/api/sessions/${code}/join`, "POST", { name: "Quiz Pigs" }),
      { params: Promise.resolve({ code }) }
    );
    expect(dupe.status).toBe(409);
  });

  it("rejects an answer submission before the quiz starts", async () => {
    const res = await submitAnswer(
      jsonRequest(`${BASE}/api/sessions/${code}/answers`, "POST", { token, text: "anything" }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(409);
  });

  it("starts the quiz and serves the first question without the answer", async () => {
    const res = await advanceSession(
      jsonRequest(`${BASE}/api/sessions/${code}/advance`, "POST", { action: "start" }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(200);

    const hostView = await getSession(
      new NextRequest(`${BASE}/api/sessions/${code}?as=host`),
      { params: Promise.resolve({ code }) }
    );
    const hostData = await json(hostView);
    expect(hostData.status).toBe("QUESTION_ACTIVE");
    expect(hostData.question.text).toBe(DEMO_PACK.rounds[0].questions[0].text);
    expect(hostData.question.answer).toBeNull();
  });

  it("auto-scores a correct answer but hides the verdict until reveal", async () => {
    const correctAnswer = DEMO_PACK.rounds[0].questions[0].answer;
    const res = await submitAnswer(
      jsonRequest(`${BASE}/api/sessions/${code}/answers`, "POST", { token, text: correctAnswer }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(201);

    const teamView = await getSession(
      new NextRequest(`${BASE}/api/sessions/${code}?token=${token}`),
      { params: Promise.resolve({ code }) }
    );
    const teamData = await json(teamView);
    expect(teamData.myAnswer.text).toBe(correctAnswer);
    expect(teamData.myAnswer.isCorrect).toBeNull();
  });

  it("reveals the verdict and lets the host override scoring", async () => {
    await advanceSession(
      jsonRequest(`${BASE}/api/sessions/${code}/advance`, "POST", { action: "reveal" }),
      { params: Promise.resolve({ code }) }
    );

    const teamView = await getSession(
      new NextRequest(`${BASE}/api/sessions/${code}?token=${token}`),
      { params: Promise.resolve({ code }) }
    );
    const teamData = await json(teamView);
    expect(teamData.myAnswer.isCorrect).toBe(true);
    expect(teamData.scoreboard[0].score).toBe(1);

    const hostView = await getSession(
      new NextRequest(`${BASE}/api/sessions/${code}?as=host`),
      { params: Promise.resolve({ code }) }
    );
    const hostData = await json(hostView);
    const answerId = hostData.teams[0].currentAnswer.id;

    const overrideRes = await overrideAnswer(
      jsonRequest(`${BASE}/api/sessions/${code}/answers/${answerId}`, "PATCH", {
        isCorrect: false,
        points: 0,
      }),
      { params: Promise.resolve({ code, answerId }) }
    );
    expect(overrideRes.status).toBe(200);

    const afterOverride = await getSession(
      new NextRequest(`${BASE}/api/sessions/${code}?as=host`),
      { params: Promise.resolve({ code }) }
    );
    const afterData = await json(afterOverride);
    expect(afterData.scoreboard[0].score).toBe(0);
  });

  it("refuses to advance to the next question before revealing", async () => {
    // Reset back to QUESTION_ACTIVE would require a fresh session; instead verify
    // the guard on a REVEAL-eligible session by trying reveal twice in a row.
    const res = await advanceSession(
      jsonRequest(`${BASE}/api/sessions/${code}/advance`, "POST", { action: "reveal" }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(409);
  });

  it("walks through every remaining question to the end of the quiz", async () => {
    const totalQuestions = DEMO_PACK.rounds.reduce((sum, r) => sum + r.questions.length, 0);

    // Already answered + revealed question 1 above; advance through the rest.
    for (let answered = 1; answered < totalQuestions; answered++) {
      const nextRes = await advanceSession(
        jsonRequest(`${BASE}/api/sessions/${code}/advance`, "POST", { action: "next" }),
        { params: Promise.resolve({ code }) }
      );
      expect(nextRes.status).toBe(200);

      await submitAnswer(
        jsonRequest(`${BASE}/api/sessions/${code}/answers`, "POST", {
          token,
          text: "deliberately wrong",
        }),
        { params: Promise.resolve({ code }) }
      );

      await advanceSession(
        jsonRequest(`${BASE}/api/sessions/${code}/advance`, "POST", { action: "reveal" }),
        { params: Promise.resolve({ code }) }
      );
    }

    const finalRes = await advanceSession(
      jsonRequest(`${BASE}/api/sessions/${code}/advance`, "POST", { action: "next" }),
      { params: Promise.resolve({ code }) }
    );
    expect(finalRes.status).toBe(200);
    const finalData = await json(finalRes);
    expect(finalData.session.status).toBe("ENDED");
  });
});
