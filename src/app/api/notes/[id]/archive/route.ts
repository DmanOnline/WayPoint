import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: { id, userId: session.userId },
    });
    if (!note) {
      return NextResponse.json(
        { error: "Notitie niet gevonden" },
        { status: 404 }
      );
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { isArchived: !note.isArchived },
      include: { folder: true },
    });

    return NextResponse.json({ note: updated });
  } catch (err) {
    console.error("PUT /api/notes/[id]/archive error:", err);
    return NextResponse.json(
      { error: "Archiveren mislukt" },
      { status: 500 }
    );
  }
}
