import { NextResponse } from "next/server";
import { createPackFromGenerated } from "@/lib/create-pack";
import { DEMO_PACK, DEMO_PACK_PROMPT } from "@/lib/demo-pack";

export async function POST() {
  const pack = await createPackFromGenerated(DEMO_PACK, DEMO_PACK_PROMPT);
  return NextResponse.json({ pack }, { status: 201 });
}
