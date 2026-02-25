import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expandRecurrences, toDateString } from "@/lib/calendar";

// GET /api/calendar/events?start=...&end=...
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: "Start en einddatum zijn verplicht" },
      { status: 400 }
    );
  }

  const rangeStart = new Date(startParam);
  const rangeEnd = new Date(endParam);

  // Get visible sub-calendar IDs
  const visibleCalendars = await prisma.subCalendar.findMany({
    where: { userId: session.userId, isVisible: true },
    select: { id: true },
  });
  const visibleIds = visibleCalendars.map((c) => c.id);

  if (visibleIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Fetch non-recurring events in range
  const regularEvents = await prisma.calendarEvent.findMany({
    where: {
      userId: session.userId,
      subCalendarId: { in: visibleIds },
      isLocallyDeleted: false,
      recurrenceRule: null,
      parentEventId: null,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    include: { subCalendar: true },
    orderBy: { startDate: "asc" },
  });

  // Fetch recurring master events
  const recurringEvents = await prisma.calendarEvent.findMany({
    where: {
      userId: session.userId,
      subCalendarId: { in: visibleIds },
      isLocallyDeleted: false,
      recurrenceRule: { not: null },
      parentEventId: null,
      startDate: { lte: rangeEnd },
      OR: [
        { recurrenceEnd: null },
        { recurrenceEnd: { gte: rangeStart } },
      ],
    },
    include: { subCalendar: true },
  });

  // Fetch exceptions (edited occurrences of recurring events)
  const exceptions = await prisma.calendarEvent.findMany({
    where: {
      userId: session.userId,
      subCalendarId: { in: visibleIds },
      parentEventId: { not: null },
    },
    include: { subCalendar: true },
  });

  // Build the result array
  const allEvents: Array<Record<string, unknown>> = [];

  // Add regular events
  for (const event of regularEvents) {
    allEvents.push({ ...event, _isVirtual: false });
  }

  // Expand recurring events
  for (const event of recurringEvents) {
    // Collect exception dates for this event
    const eventExceptions = exceptions.filter(
      (e) => e.parentEventId === event.id
    );
    const exceptionDates = new Set(
      eventExceptions.map((e) =>
        e.originalDate ? toDateString(e.originalDate) : ""
      )
    );

    const occurrences = expandRecurrences(
      {
        id: event.id,
        startDate: event.startDate,
        endDate: event.endDate,
        recurrenceRule: event.recurrenceRule!,
        recurrenceEnd: event.recurrenceEnd,
      },
      rangeStart,
      rangeEnd,
      exceptionDates
    );

    for (const occ of occurrences) {
      allEvents.push({
        ...event,
        startDate: occ.start,
        endDate: occ.end,
        _virtualId: occ.virtualId,
        _isVirtual: true,
      });
    }

    // Add non-deleted exception events that fall in the range
    for (const exc of eventExceptions) {
      if (
        !exc.isLocallyDeleted &&
        exc.startDate <= rangeEnd &&
        exc.endDate >= rangeStart
      ) {
        allEvents.push({ ...exc, _isVirtual: false });
      }
    }
  }

  return NextResponse.json({ events: allEvents });
}

// POST /api/calendar/events
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

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
  } = body;

  if (!title || !subCalendarId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Titel, kalender, start- en einddatum zijn verplicht" },
      { status: 400 }
    );
  }

  // Verify the sub-calendar belongs to the user
  const subCalendar = await prisma.subCalendar.findFirst({
    where: { id: subCalendarId, userId: session.userId },
  });

  if (!subCalendar) {
    return NextResponse.json(
      { error: "Kalender niet gevonden" },
      { status: 404 }
    );
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: session.userId,
      subCalendarId,
      title,
      description: description || null,
      location: location || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay: isAllDay || false,
      recurrenceRule: recurrenceRule || null,
      recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
    },
    include: { subCalendar: true },
  });

  return NextResponse.json({ event }, { status: 201 });
}
