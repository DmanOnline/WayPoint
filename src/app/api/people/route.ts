import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePerson(p: any) {
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
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const type = params.get("type");
    const search = params.get("search");
    const archived = params.get("archived") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId, isArchived: archived };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
      ];
    }

    const people = await prisma.person.findMany({
      where,
      include: {
        _count: { select: { interactions: true, followUps: true } },
      },
      orderBy: [{ isPinned: "desc" }, { lastContactedAt: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ people: people.map(parsePerson) });
  } catch (err) {
    console.error("GET /api/people error:", err);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, nickname, type, company, role, email, phone, birthday, location, avatarColor, bio, tags, contactFrequency, metAt, metThrough } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    const maxSort = await prisma.person.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const person = await prisma.person.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        nickname: nickname?.trim() || null,
        type: type || null,
        company: company?.trim() || null,
        role: role?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        birthday: birthday ? new Date(birthday) : null,
        location: location?.trim() || null,
        avatarColor: avatarColor || "#6366f1",
        bio: bio?.trim() || null,
        tags: tags?.length ? JSON.stringify(tags) : null,
        contactFrequency: contactFrequency || null,
        metAt: metAt ? new Date(metAt) : null,
        metThrough: metThrough?.trim() || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { interactions: true, followUps: true } } },
    });

    return NextResponse.json({ person: parsePerson(person) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/people error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}
