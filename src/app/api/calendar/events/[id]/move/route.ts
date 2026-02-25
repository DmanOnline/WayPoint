import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/calendar/events/[id]/move
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { newStartDate, newEndDate, editMode, originalDate } = body;

  if (!newStartDate || !newEndDate) {
    return NextResponse.json(
      { error: "Nieuwe start- en einddatum zijn verplicht" },
      { status: 400 }
    );
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Evenement niet gevonden" },
      { status: 404 }
    );
  }

  // If moving a single occurrence of a recurring event
  if (editMode === "this" && existing.recurrenceRule && originalDate) {
    const exception = await prisma.calendarEvent.create({
      data: {
        userId: session.userId,
        subCalendarId: existing.subCalendarId,
        title: existing.title,
        description: existing.description,
        location: existing.location,
        startDate: new Date(newStartDate),
        endDate: new Date(newEndDate),
        isAllDay: existing.isAllDay,
        parentEventId: existing.id,
        originalDate: new Date(originalDate),
        isLocallyModified: !!existing.icalUid,
      },
      include: { subCalendar: true },
    });

    return NextResponse.json({ event: exception });
  }

  // Move the event directly
  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      startDate: new Date(newStartDate),
      endDate: new Date(newEndDate),
      isLocallyModified: existing.icalUid ? true : existing.isLocallyModified,
    },
    include: { subCalendar: true },
  });

  return NextResponse.json({ event });
}
