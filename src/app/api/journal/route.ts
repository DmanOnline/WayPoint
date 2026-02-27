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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");
    const limit = params.get("limit") ? parseInt(params.get("limit")!) : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from + "T00:00:00.000Z");
      if (to) where.date.lte = new Date(to + "T23:59:59.999Z");
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      include: {
        personMentions: {
          include: { person: { select: { id: true, name: true, avatarColor: true } } },
        },
      },
    });

    return NextResponse.json({ entries: entries.map(parseEntry) });
  } catch (err) {
    console.error("GET /api/journal error:", err);
    return NextResponse.json({ error: "Entries ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, title, content, mood, moodNote, energy, gratitude1, gratitude2, gratitude3, tags, mentionedPersonIds } = body;

    if (!date) {
      return NextResponse.json({ error: "Datum is verplicht" }, { status: 400 });
    }

    const entryDate = new Date(date + "T00:00:00.000Z");

    const data = {
      title: title?.trim() || null,
      content: content ?? "",
      mood: mood ?? null,
      moodNote: moodNote?.trim() || null,
      energy: energy ?? null,
      gratitude1: gratitude1?.trim() || null,
      gratitude2: gratitude2?.trim() || null,
      gratitude3: gratitude3?.trim() || null,
      tags: tags?.length ? JSON.stringify(tags) : null,
    };

    // Upsert: one canonical entry per day
    const entry = await prisma.journalEntry.upsert({
      where: { userId_date: { userId: session.userId, date: entryDate } },
      create: { userId: session.userId, date: entryDate, ...data },
      update: data,
    });

    // Sync person mentions if provided
    if (Array.isArray(mentionedPersonIds)) {
      const existing = await prisma.journalPersonMention.findMany({
        where: { journalEntryId: entry.id },
        select: { personId: true },
      });
      const existingIds = new Set(existing.map((m) => m.personId));
      const newIds = new Set(mentionedPersonIds as string[]);

      // Delete removed mentions
      const toDelete = [...existingIds].filter((id) => !newIds.has(id));
      if (toDelete.length > 0) {
        await prisma.journalPersonMention.deleteMany({
          where: { journalEntryId: entry.id, personId: { in: toDelete } },
        });
      }

      // Add new mentions
      const toAdd = [...newIds].filter((id) => !existingIds.has(id));
      if (toAdd.length > 0) {
        await prisma.journalPersonMention.createMany({
          data: toAdd.map((personId) => ({ journalEntryId: entry.id, personId })),
          skipDuplicates: true,
        });
      }
    }

    // Re-fetch with mentions included
    const full = await prisma.journalEntry.findUnique({
      where: { id: entry.id },
      include: {
        personMentions: {
          include: { person: { select: { id: true, name: true, avatarColor: true } } },
        },
      },
    });

    return NextResponse.json({ entry: parseEntry(full) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/journal error:", err);
    return NextResponse.json({ error: "Entry opslaan mislukt" }, { status: 500 });
  }
}
