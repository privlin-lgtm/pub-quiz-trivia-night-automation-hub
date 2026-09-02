import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { PackEditor } from "./PackEditor";

export const dynamic = "force-dynamic";

export default async function PackEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await db.quizPack.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: { index: "asc" },
        include: { questions: { orderBy: { index: "asc" } } },
      },
    },
  });
  if (!pack) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PackEditor
          pack={{
            ...pack,
            createdAt: pack.createdAt.toISOString(),
          }}
        />
      </main>
    </>
  );
}
