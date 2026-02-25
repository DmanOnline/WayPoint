import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateICS } from "@/lib/ical";

// GET /api/calendar/export?subCalendarId=...
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const subCalendarId = request.nextUrl.searchParams.get("subCalendarId");

  let calendarName = "MyLifeSystem";
  const where: Record<string, unknown> = {
    userId: session.userId,
    isLocallyDeleted: false,
    parentEventId: null, // Only export master events, not exceptions
  };

  if (subCalendarId) {
    const subCalendar = await prisma.subCalendar.findFirst({
      where: { id: subCalendarId, userId: session.userId },
    });
    if (!subCalendar) {
      return NextResponse.json(
        { error: "Kalender niet gevonden" },
        { status: 404 }
      );
    }
    where.subCalendarId = subCalendarId;
    calendarName = subCalendar.name;
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startDate: "asc" },
  });

  const icsContent = generateICS(events, calendarName);

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${calendarName.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`,
    },
  });
}
