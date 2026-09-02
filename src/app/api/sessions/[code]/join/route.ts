import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateTeamToken } from "@/lib/codes";

const joinSchema = z.object({
  name: z.string().min(1).max(40),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  const session = await db.session.findUnique({ where: { code: code.toUpperCase() } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const name = parsed.data.name.trim();
  const existing = await db.team.findUnique({
    where: { sessionId_name: { sessionId: session.id, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "That team name is already taken in this session" },
      { status: 409 }
    );
  }

  const team = await db.team.create({
    data: { sessionId: session.id, name, token: generateTeamToken() },
  });

  return NextResponse.json({ token: team.token, teamId: team.id, teamName: team.name }, { status: 201 });
}
