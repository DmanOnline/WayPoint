import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePerson(p: any) {
  // Merge relationships from both sides with otherPerson resolved
  const relationships = [
    ...(p.relationshipsA ?? []).map((r: any) => ({
      id: r.id, personAId: r.personAId, personBId: r.personBId,
      type: r.type, label: r.label,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      otherPerson: r.personB,
    })),
    ...(p.relationshipsB ?? []).map((r: any) => ({
      id: r.id, personAId: r.personAId, personBId: r.personBId,
      type: r.type, label: r.label,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      otherPerson: r.personA,
    })),
  ];

  return {
    ...p,
    birthday: p.birthday?.toISOString() ?? null,
    lastContactedAt: p.lastContactedAt?.toISOString() ?? null,
    metAt: p.metAt?.toISOString() ?? null,
    tags: p.tags ? JSON.parse(p.tags) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    interactions: p.interactions?.map((i: any) => ({
      ...i,
      date: i.date.toISOString(),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    followUps: p.followUps?.map((f: any) => ({
      ...f,
      doneAt: f.doneAt?.toISOString() ?? null,
      dueDate: f.dueDate?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    lifeEvents: p.lifeEvents?.map((e: any) => ({
      ...e,
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    relationships,
    // Remove raw relationship arrays
    relationshipsA: undefined,
    relationshipsB: undefined,
    journalMentions: p.journalMentions?.map((m: any) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      journalEntry: m.journalEntry ? {
        ...m.journalEntry,
        date: m.journalEntry.date.toISOString(),
      } : undefined,
    })),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, userId: session.userId },
    include: {
      interactions: { orderBy: { date: "desc" } },
      followUps: { orderBy: { createdAt: "asc" } },
      lifeEvents: { orderBy: { date: "desc" } },
      relationshipsA: {
        include: { personB: { select: { id: true, name: true, avatarColor: true } } },
      },
      relationshipsB: {
        include: { personA: { select: { id: true, name: true, avatarColor: true } } },
      },
      journalMentions: {
        include: { journalEntry: { select: { id: true, date: true, title: true, mood: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { interactions: true, followUps: true } },
    },
  });

  if (!person) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json({ person: parsePerson(person) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.person.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const body = await request.json();
    const { name, nickname, type, company, role, email, phone, birthday, location, avatarColor, bio, tags, isPinned, isArchived, lastContactedAt, contactFrequency, metAt, metThrough } = body;

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(nickname !== undefined && { nickname: nickname?.trim() || null }),
        ...(type !== undefined && { type: type || null }),
        ...(company !== undefined && { company: company?.trim() || null }),
        ...(role !== undefined && { role: role?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(birthday !== undefined && { birthday: birthday ? new Date(birthday) : null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(avatarColor !== undefined && { avatarColor }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(tags !== undefined && { tags: tags?.length ? JSON.stringify(tags) : null }),
        ...(contactFrequency !== undefined && { contactFrequency: contactFrequency || null }),
        ...(metAt !== undefined && { metAt: metAt ? new Date(metAt) : null }),
        ...(metThrough !== undefined && { metThrough: metThrough?.trim() || null }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isArchived !== undefined && { isArchived }),
        ...(lastContactedAt !== undefined && { lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null }),
      },
      include: {
        interactions: { orderBy: { date: "desc" } },
        followUps: { orderBy: { createdAt: "asc" } },
        _count: { select: { interactions: true, followUps: true } },
      },
    });

    return NextResponse.json({ person: parsePerson(person) });
  } catch (err) {
    console.error("PUT /api/people/[id] error:", err);
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.person.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
