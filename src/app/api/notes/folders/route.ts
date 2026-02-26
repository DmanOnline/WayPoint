import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const folders = await prisma.noteFolder.findMany({
      where: { userId: session.userId },
      include: { _count: { select: { notes: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ folders });
  } catch (err) {
    console.error("GET /api/notes/folders error:", err);
    return NextResponse.json(
      { error: "Mappen ophalen mislukt" },
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
    const { name, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Naam is verplicht" },
        { status: 400 }
      );
    }

    const existing = await prisma.noteFolder.findFirst({
      where: { userId: session.userId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Map bestaat al" },
        { status: 409 }
      );
    }

    const maxSort = await prisma.noteFolder.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const folder = await prisma.noteFolder.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        color: color || "#6C63FF",
        icon: icon || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { notes: true } } },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    console.error("POST /api/notes/folders error:", err);
    return NextResponse.json(
      { error: "Map aanmaken mislukt" },
      { status: 500 }
    );
  }
}
