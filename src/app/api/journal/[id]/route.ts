import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEntry(entry: any) {
  return {
    ...entry,
    date: entry.date.toISOString(),
    tags: entry.tags ? JSON.parse(entry.tags) : null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    personMentions: entry.personMentions?.map((m: any) => ({
      id: m.id,
      personId: m.personId,
      person: m.person,
    })),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: session.userId },
    include: {
      personMentions: {
        include: { person: { select: { id: true, name: true, avatarColor: true } } },
      },
    },
  });

  if (!entry) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json({ entry: parseEntry(entry) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const body = await request.json();
    const { title, content, mood, moodNote, energy, gratitude1, gratitude2, gratitude3, tags } = body;

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        title: title?.trim() || null,
        content: content ?? existing.content,
        mood: mood !== undefined ? mood : existing.mood,
        moodNote: moodNote?.trim() || null,
        energy: energy !== undefined ? energy : existing.energy,
        gratitude1: gratitude1?.trim() || null,
        gratitude2: gratitude2?.trim() || null,
        gratitude3: gratitude3?.trim() || null,
        tags: tags !== undefined ? (tags?.length ? JSON.stringify(tags) : null) : existing.tags,
      },
    });

    return NextResponse.json({ entry: parseEntry(entry) });
  } catch (err) {
    console.error("PUT /api/journal/[id] error:", err);
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
