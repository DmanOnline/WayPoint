-- CreateTable
CREATE TABLE "SubCalendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icalUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subCalendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceEnd" TIMESTAMP(3),
    "parentEventId" TEXT,
    "originalDate" TIMESTAMP(3),
    "icalUid" TEXT,
    "isLocallyModified" BOOLEAN NOT NULL DEFAULT false,
    "isLocallyDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubCalendar_userId_idx" ON "SubCalendar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCalendar_userId_name_key" ON "SubCalendar"("userId", "name");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startDate_endDate_idx" ON "CalendarEvent"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_recurrenceRule_idx" ON "CalendarEvent"("userId", "recurrenceRule");

-- CreateIndex
CREATE INDEX "CalendarEvent_subCalendarId_icalUid_idx" ON "CalendarEvent"("subCalendarId", "icalUid");

-- AddForeignKey
ALTER TABLE "SubCalendar" ADD CONSTRAINT "SubCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_subCalendarId_fkey" FOREIGN KEY ("subCalendarId") REFERENCES "SubCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
