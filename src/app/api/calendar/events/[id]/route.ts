import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/events/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.calendarEvent.findFirst({
    where: { id, userId: session.userId },
    include: { subCalendar: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Evenement niet gevonden" },
      { status: 404 }
    );
  }

  return NextResponse.json({ event });
}

// PUT /api/calendar/events/[id]
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
  const {
    title,
    description,
    location,
    subCalendarId,
    startDate,
    endDate,
    isAllDay,
    recurrenceRule,
    recurrenceEnd,
    editMode, // "this" | "all" for recurring events
    originalDate, // for "this" mode - which occurrence to edit
  } = body;

  // Get the existing event
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Evenement niet gevonden" },
      { status: 404 }
    );
  }

  // If editing a single occurrence of a recurring event
  if (editMode === "this" && existing.recurrenceRule && originalDate) {
    // Create an exception event
    const exception = await prisma.calendarEvent.create({
      data: {
        userId: session.userId,
        subCalendarId: subCalendarId || existing.subCalendarId,
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        location: location !== undefined ? location : existing.location,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate ? new Date(endDate) : existing.endDate,
        isAllDay: isAllDay !== undefined ? isAllDay : existing.isAllDay,
        parentEventId: existing.id,
        originalDate: new Date(originalDate),
        isLocallyModified: !!existing.icalUid,
      },
      include: { subCalendar: true },
    });

    return NextResponse.json({ event: exception });
  }

  // Edit the event directly (or "all" mode for recurring)
  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      location: location !== undefined ? location : existing.location,
      subCalendarId: subCalendarId || existing.subCalendarId,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      isAllDay: isAllDay !== undefined ? isAllDay : existing.isAllDay,
      recurrenceRule:
        recurrenceRule !== undefined ? recurrenceRule : existing.recurrenceRule,
      recurrenceEnd:
        recurrenceEnd !== undefined
          ? recurrenceEnd
            ? new Date(recurrenceEnd)
            : null
          : existing.recurrenceEnd,
      isLocallyModified: existing.icalUid ? true : existing.isLocallyModified,
    },
    include: { subCalendar: true },
  });

  return NextResponse.json({ event });
}

// DELETE /api/calendar/events/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const deleteMode = request.nextUrl.searchParams.get("deleteMode") || "all";
  const originalDate = request.nextUrl.searchParams.get("originalDate");

  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Evenement niet gevonden" },
      { status: 404 }
    );
  }

  if (deleteMode === "this" && existing.recurrenceRule && originalDate) {
    // Create an exception marked as deleted
    await prisma.calendarEvent.create({
      data: {
        userId: session.userId,
        subCalendarId: existing.subCalendarId,
        title: existing.title,
        startDate: existing.startDate,
        endDate: existing.endDate,
        parentEventId: existing.id,
        originalDate: new Date(originalDate),
        isLocallyDeleted: true,
      },
    });

    return NextResponse.json({ success: true });
  }

  if (deleteMode === "future" && existing.recurrenceRule && originalDate) {
    // Set recurrence end to the day before the original date
    const newEnd = new Date(originalDate);
    newEnd.setDate(newEnd.getDate() - 1);

    await prisma.calendarEvent.update({
      where: { id },
      data: { recurrenceEnd: newEnd },
    });

    return NextResponse.json({ success: true });
  }

  // Delete all (or single non-recurring event)
  if (existing.icalUid || existing.parentEventId) {
    // For iCal events (or exceptions of iCal events), mark as locally deleted
    // instead of actually deleting, so the sync won't recreate them
    await prisma.calendarEvent.update({
      where: { id },
      data: { isLocallyDeleted: true },
    });
  } else {
    // Also delete any child exceptions
    await prisma.calendarEvent.deleteMany({
      where: { parentEventId: id },
    });
    await prisma.calendarEvent.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
