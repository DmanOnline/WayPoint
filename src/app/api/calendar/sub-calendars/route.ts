import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/sub-calendars
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const subCalendars = await prisma.subCalendar.findMany({
    where: { userId: session.userId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ subCalendars });
}

// POST /api/calendar/sub-calendars
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await request.json();
  const { name, color, icalUrl } = body;

  if (!name || !color) {
    return NextResponse.json(
      { error: "Naam en kleur zijn verplicht" },
      { status: 400 }
    );
  }

  // Check for duplicate name
  const existing = await prisma.subCalendar.findFirst({
    where: { userId: session.userId, name },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Er bestaat al een kalender met deze naam" },
      { status: 409 }
    );
  }

  // Get highest sort order
  const maxSort = await prisma.subCalendar.findFirst({
    where: { userId: session.userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const subCalendar = await prisma.subCalendar.create({
    data: {
      userId: session.userId,
      name,
      color,
      icalUrl: icalUrl || null,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ subCalendar }, { status: 201 });
}
