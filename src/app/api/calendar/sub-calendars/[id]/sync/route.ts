import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseICS } from "@/lib/ical";

// POST /api/calendar/sub-calendars/[id]/sync
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const subCalendar = await prisma.subCalendar.findFirst({
    where: { id, userId: session.userId },
  });

  if (!subCalendar) {
    return NextResponse.json(
      { error: "Kalender niet gevonden" },
      { status: 404 }
    );
  }

  if (!subCalendar.icalUrl) {
    return NextResponse.json(
      { error: "Deze kalender heeft geen iCal URL" },
      { status: 400 }
    );
  }

  try {
    // Convert webcal:// to https:// for fetching
    const fetchUrl = subCalendar.icalUrl.replace(/^webcal:\/\//, "https://");

    // Fetch the iCal feed
    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "MyLifeSystem/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Fout bij ophalen van iCal feed: ${response.status}` },
        { status: 502 }
      );
    }

    const icsContent = await response.text();
    const parsedEvents = parseICS(icsContent);

    // Get ALL existing events for this sub-calendar (including deleted)
    const existingEvents = await prisma.calendarEvent.findMany({
      where: {
        subCalendarId: id,
        icalUid: { not: null },
      },
    });

    const existingByUid = new Map(
      existingEvents.map((e) => [e.icalUid, e])
    );
    const feedUids = new Set(parsedEvents.map((e) => e.uid));

    // Build a set of locally deleted event signatures (title + startDate)
    // to prevent re-creating events with changed UIDs
    const allSubCalEvents = await prisma.calendarEvent.findMany({
      where: {
        subCalendarId: id,
        isLocallyDeleted: true,
      },
    });
    const deletedSignatures = new Set(
      allSubCalEvents.map((e) => `${e.title}__${e.startDate.toISOString()}`)
    );

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Process parsed events
    for (const parsed of parsedEvents) {
      const existing = existingByUid.get(parsed.uid);

      if (!existing) {
        // Check if this event was previously deleted (by title + date match)
        const signature = `${parsed.title}__${parsed.startDate.toISOString()}`;
        if (deletedSignatures.has(signature)) {
          // This event was deleted by the user, don't recreate it
          continue;
        }

        // New event - create it
        await prisma.calendarEvent.create({
          data: {
            userId: session.userId,
            subCalendarId: id,
            title: parsed.title,
            description: parsed.description,
            location: parsed.location,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            isAllDay: parsed.isAllDay,
            recurrenceRule: parsed.recurrenceRule,
            recurrenceEnd: parsed.recurrenceEnd,
            icalUid: parsed.uid,
          },
        });
        created++;
      } else if (!existing.isLocallyModified && !existing.isLocallyDeleted) {
        // Existing event that hasn't been locally modified - update it
        const hasChanges =
          existing.title !== parsed.title ||
          existing.description !== parsed.description ||
          existing.location !== parsed.location ||
          existing.startDate.getTime() !== parsed.startDate.getTime() ||
          existing.endDate.getTime() !== parsed.endDate.getTime() ||
          existing.isAllDay !== parsed.isAllDay ||
          existing.recurrenceRule !== parsed.recurrenceRule;

        if (hasChanges) {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: {
              title: parsed.title,
              description: parsed.description,
              location: parsed.location,
              startDate: parsed.startDate,
              endDate: parsed.endDate,
              isAllDay: parsed.isAllDay,
              recurrenceRule: parsed.recurrenceRule,
              recurrenceEnd: parsed.recurrenceEnd,
            },
          });
          updated++;
        }
      }
      // If locally modified or deleted, skip (preserve local changes)
    }

    // Remove events that are no longer in the feed
    // (only if they haven't been locally modified or deleted)
    for (const existing of existingEvents) {
      if (
        existing.icalUid &&
        !feedUids.has(existing.icalUid) &&
        !existing.isLocallyModified &&
        !existing.isLocallyDeleted
      ) {
        await prisma.calendarEvent.delete({ where: { id: existing.id } });
        deleted++;
      }
    }

    // Update last synced timestamp
    await prisma.subCalendar.update({
      where: { id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      deleted,
      total: parsedEvents.length,
    });
  } catch (error) {
    console.error("iCal sync error:", error);
    return NextResponse.json(
      { error: "Fout bij synchroniseren van iCal feed" },
      { status: 500 }
    );
  }
}
