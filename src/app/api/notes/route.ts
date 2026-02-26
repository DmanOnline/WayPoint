import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get("folderId");
    const search = searchParams.get("search");
    const pinned = searchParams.get("pinned");
    const archived = searchParams.get("archived") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId, isArchived: archived };

    if (pinned === "true") {
      where.isPinned = true;
    }
    if (folderId) {
      where.folderId = folderId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
      ];
    }

    const notes = await prisma.note.findMany({
      where,
      include: { folder: true },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ notes });
  } catch (err) {
    console.error("GET /api/notes error:", err);
    return NextResponse.json(
      { error: "Notities ophalen mislukt" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, color, folderId, tags } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Titel is verplicht" },
        { status: 400 }
      );
    }

    if (folderId) {
      const folder = await prisma.noteFolder.findFirst({
        where: { id: folderId, userId: session.userId },
      });
      if (!folder) {
        return NextResponse.json(
          { error: "Map niet gevonden" },
          { status: 404 }
        );
      }
    }

    const maxSort = await prisma.note.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const note = await prisma.note.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        content: content || "",
        color: color || "#ffffff",
        folderId: folderId || null,
        tags: tags ? JSON.stringify(tags) : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: { folder: true },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("POST /api/notes error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Notitie aanmaken mislukt", detail: message },
      { status: 500 }
    );
  }
}
