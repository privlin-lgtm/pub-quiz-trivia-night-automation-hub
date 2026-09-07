import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as exportPack } from "@/app/api/packs/[id]/export/route";
import { POST as importPack } from "@/app/api/packs/import/route";
import { createPackFromGenerated } from "@/lib/create-pack";
import { DEMO_PACK, DEMO_PACK_PROMPT } from "@/lib/demo-pack";
import { db } from "@/lib/db";
import { PACK_FILE_FORMAT, PACK_FILE_VERSION } from "@/lib/pack-file";
import { parseOptions } from "@/lib/question-types";

const BASE = "http://localhost:3000";

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("pack export / import", () => {
  let packId: string;

  beforeAll(async () => {
    // Dedicated pack (see routes.integration.test.ts for why the title must
    // not be DEMO_PACK.title): this one gets an acceptableAnswers entry so the
    // round trip proves the host-approved alternates survive the file.
    const pack = await createPackFromGenerated(
      { ...DEMO_PACK, title: "Export Round-Trip Pack (dedicated)" },
      DEMO_PACK_PROMPT
    );
    packId = pack.id;
    await db.question.update({
      where: { id: pack.rounds[0].questions[1].id },
      data: { acceptableAnswers: JSON.stringify(["7", "VII"]) },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("404s when exporting a pack that doesn't exist", async () => {
    const res = await exportPack(new NextRequest(`${BASE}/api/packs/nope/export`), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("exports a downloadable file and imports it back as an identical new pack", async () => {
    const res = await exportPack(new NextRequest(`${BASE}/api/packs/${packId}/export`), {
      params: Promise.resolve({ id: packId }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="export-round-trip-pack.*\.json"$/);
    const file = await res.json();
    expect(file.format).toBe(PACK_FILE_FORMAT);
    expect(file.version).toBe(PACK_FILE_VERSION);
    expect(JSON.stringify(file)).not.toContain('"id"');

    const imported = await importPack(jsonRequest(`${BASE}/api/packs/import`, file));
    expect(imported.status).toBe(201);
    const { pack } = await imported.json();
    expect(pack.id).not.toBe(packId);

    const original = await db.quizPack.findUniqueOrThrow({
      where: { id: packId },
      include: { rounds: { orderBy: { index: "asc" }, include: { questions: { orderBy: { index: "asc" } } } } },
    });
    const copy = await db.quizPack.findUniqueOrThrow({
      where: { id: pack.id },
      include: { rounds: { orderBy: { index: "asc" }, include: { questions: { orderBy: { index: "asc" } } } } },
    });
    expect(copy.title).toBe(original.title);
    expect(copy.prompt).toBe(original.prompt);
    expect(copy.rounds.length).toBe(original.rounds.length);
    original.rounds.forEach((round, r) => {
      expect(copy.rounds[r].title).toBe(round.title);
      expect(copy.rounds[r].category).toBe(round.category);
      expect(copy.rounds[r].questions.length).toBe(round.questions.length);
      round.questions.forEach((q, i) => {
        const c = copy.rounds[r].questions[i];
        expect([c.text, c.answer, c.points, c.type]).toEqual([q.text, q.answer, q.points, q.type]);
        expect(parseOptions(c.options)).toEqual(parseOptions(q.options));
        expect(parseOptions(c.acceptableAnswers)).toEqual(parseOptions(q.acceptableAnswers));
      });
    });
    expect(parseOptions(copy.rounds[0].questions[1].acceptableAnswers)).toEqual(["7", "VII"]);
  });

  it("rejects a file that isn't a pack file with a readable 400", async () => {
    const res = await importPack(jsonRequest(`${BASE}/api/packs/import`, { title: "Not a pack" }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toMatch(/pack file/i);
  });

  it("rejects a file from a newer format version", async () => {
    const res = await importPack(
      jsonRequest(`${BASE}/api/packs/import`, {
        format: PACK_FILE_FORMAT,
        version: PACK_FILE_VERSION + 1,
        title: "Future",
        rounds: [{ title: "R", category: "C", questions: [{ text: "Q?", answer: "A" }] }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await importPack(
      new NextRequest(`${BASE}/api/packs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      })
    );
    expect(res.status).toBe(400);
  });
});
