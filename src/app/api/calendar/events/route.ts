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

  // Include birthdays from People module
  const peopleWithBirthdays = await prisma.person.findMany({
    where: { userId: session.userId, isArchived: false, birthday: { not: null } },
    select: { id: true, name: true, birthday: true, avatarColor: true },
  });

  for (const person of peopleWithBirthdays) {
    if (!person.birthday) continue;
    const bday = new Date(person.birthday);
    const bdayMonth = bday.getMonth();
    const bdayDay = bday.getDate();

    // Check each year in the range
    const startYear = rangeStart.getFullYear();
    const endYear = rangeEnd.getFullYear();
    for (let year = startYear; year <= endYear; year++) {
      const eventDate = new Date(year, bdayMonth, bdayDay);
      if (eventDate >= rangeStart && eventDate <= rangeEnd) {
        const age = year - bday.getFullYear();
        allEvents.push({
          id: `birthday_${person.id}_${year}`,
          userId: session.userId,
          title: `🎂 ${person.name}${age > 0 ? ` (${age})` : ""}`,
          description: null,
          location: null,
          startDate: eventDate,
          endDate: eventDate,
          isAllDay: true,
          recurrenceRule: null,
          recurrenceEnd: null,
          parentEventId: null,
          originalDate: null,
          icalUid: null,
          isLocallyModified: false,
          isLocallyDeleted: false,
          subCalendarId: "people",
          subCalendar: {
            id: "people",
            name: "Mensen",
            color: person.avatarColor || "#ec4899",
            isVisible: true,
            userId: session.userId,
            sortOrder: 998,
            icalUrl: null,
            lastSyncedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          _isVirtual: false,
          _isBirthday: true,
          _personId: person.id,
        });
      }
    }
  }

  // Include follow-ups with due dates from People module
  const followUpsInRange = await prisma.personFollowUp.findMany({
    where: {
      isDone: false,
      dueDate: { not: null, gte: rangeStart, lte: rangeEnd },
      person: { userId: session.userId, isArchived: false },
    },
    include: { person: { select: { id: true, name: true, avatarColor: true } } },
  });

  for (const fu of followUpsInRange) {
    if (!fu.dueDate) continue;
    allEvents.push({
      id: `followup_${fu.id}`,
      userId: session.userId,
      title: `📋 ${fu.text} — ${fu.person.name}`,
      description: null,
      location: null,
      startDate: fu.dueDate,
      endDate: fu.dueDate,
      isAllDay: true,
      recurrenceRule: null,
      recurrenceEnd: null,
      parentEventId: null,
      originalDate: null,
      icalUid: null,
      isLocallyModified: false,
      isLocallyDeleted: false,
      subCalendarId: "people",
      subCalendar: {
        id: "people",
        name: "Mensen",
        color: fu.person.avatarColor || "#f59e0b",
        isVisible: true,
        userId: session.userId,
        sortOrder: 998,
        icalUrl: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      _isVirtual: false,
      _isFollowUp: true,
      _followUpId: fu.id,
      _personId: fu.person.id,
    });
  }

  // Also include tasks as calendar events
  const tasksDayStart = new Date(rangeStart);
  const tasksDayEnd = new Date(rangeEnd);

  const tasksInRange = await prisma.task.findMany({
    where: {
      userId: session.userId,
      status: { not: "done" },
      scheduledDate: { gte: tasksDayStart, lte: tasksDayEnd },
    },
    include: { project: true },
  });

  for (const task of tasksInRange) {
    if (!task.scheduledDate) continue;

    let startDate: Date;
    let endDate: Date;
    let isAllDay = false;

    if (task.scheduledTime) {
      // Task with specific time → timed event
      startDate = new Date(
        `${task.scheduledDate.toISOString().substring(0, 10)}T${task.scheduledTime}:00`
      );
      endDate = new Date(
        startDate.getTime() + (task.estimatedDuration || 60) * 60 * 1000
      );
    } else {
      // Task without time → all-day event
      startDate = new Date(task.scheduledDate);
      endDate = new Date(task.scheduledDate);
      isAllDay = true;
    }

    allEvents.push({
      id: `task_${task.id}`,
      userId: task.userId,
      title: `✓ ${task.title}`,
      description: task.description,
      location: null,
      startDate,
      endDate,
      isAllDay,
      recurrenceRule: null,
      recurrenceEnd: null,
      parentEventId: null,
      originalDate: null,
      icalUid: null,
      isLocallyModified: false,
      isLocallyDeleted: false,
      subCalendarId: "tasks",
      subCalendar: {
        id: "tasks",
        name: "Taken",
        color: task.project?.color || "#3b82f6",
        isVisible: true,
        userId: task.userId,
        sortOrder: 999,
        icalUrl: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      _isVirtual: false,
      _isTask: true,
      _taskId: task.id,
      _taskStatus: task.status,
      _taskPriority: task.priority,
    });
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
