import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, icon } = body;

    const folder = await prisma.noteFolder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!folder) {
      return NextResponse.json(
        { error: "Map niet gevonden" },
        { status: 404 }
      );
    }

    if (name && name.trim() !== folder.name) {
      const existing = await prisma.noteFolder.findFirst({
        where: { userId: session.userId, name: name.trim(), id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Map met deze naam bestaat al" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.noteFolder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon: icon || null }),
      },
      include: { _count: { select: { notes: true } } },
    });

    return NextResponse.json({ folder: updated });
  } catch (err) {
    console.error("PUT /api/notes/folders/[id] error:", err);
    return NextResponse.json(
      { error: "Map bijwerken mislukt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const folder = await prisma.noteFolder.findFirst({
      where: { id, userId: session.userId },
    });
    if (!folder) {
      return NextResponse.json(
        { error: "Map niet gevonden" },
        { status: 404 }
      );
    }

    await prisma.note.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });

    await prisma.noteFolder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/notes/folders/[id] error:", err);
    return NextResponse.json(
      { error: "Map verwijderen mislukt" },
      { status: 500 }
    );
  }
}
