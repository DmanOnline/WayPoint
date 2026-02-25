import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/calendar/sub-calendars/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, color, isVisible, icalUrl } = body;

  const existing = await prisma.subCalendar.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Kalender niet gevonden" },
      { status: 404 }
    );
  }

  // Check for duplicate name if name changed
  if (name && name !== existing.name) {
    const duplicate = await prisma.subCalendar.findFirst({
      where: { userId: session.userId, name, id: { not: id } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Er bestaat al een kalender met deze naam" },
        { status: 409 }
      );
    }
  }

  const subCalendar = await prisma.subCalendar.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(isVisible !== undefined && { isVisible }),
      ...(icalUrl !== undefined && { icalUrl: icalUrl || null }),
    },
  });

  return NextResponse.json({ subCalendar });
}

// DELETE /api/calendar/sub-calendars/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.subCalendar.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Kalender niet gevonden" },
      { status: 404 }
    );
  }

  // Cascade delete will remove all events
  await prisma.subCalendar.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
