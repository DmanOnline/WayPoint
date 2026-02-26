import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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
      include: { folder: true },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Notitie niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ note });
  } catch (err) {
    console.error("GET /api/notes/[id] error:", err);
    return NextResponse.json(
      { error: "Notitie ophalen mislukt" },
      { status: 500 }
    );
  }
}

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
    const { title, content, color, folderId, tags, isPinned, isArchived } = body;

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
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        ...(folderId !== undefined && { folderId: folderId || null }),
        ...(tags !== undefined && { tags: tags ? JSON.stringify(tags) : null }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isArchived !== undefined && { isArchived }),
      },
      include: { folder: true },
    });

    return NextResponse.json({ note: updated });
  } catch (err) {
    console.error("PUT /api/notes/[id] error:", err);
    return NextResponse.json(
      { error: "Notitie bijwerken mislukt" },
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

    const note = await prisma.note.findFirst({
      where: { id, userId: session.userId },
    });
    if (!note) {
      return NextResponse.json(
        { error: "Notitie niet gevonden" },
        { status: 404 }
      );
    }

    await prisma.note.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/notes/[id] error:", err);
    return NextResponse.json(
      { error: "Notitie verwijderen mislukt" },
      { status: 500 }
    );
  }
}
