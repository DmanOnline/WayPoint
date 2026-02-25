// iCal (.ics) parser and generator

interface ParsedEvent {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  recurrenceRule: string | null;
  recurrenceEnd: Date | null;
}

/**
 * Parse an iCal (.ics) string into an array of event objects.
 */
export function parseICS(icsString: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Unfold long lines (RFC 5545 section 3.1)
  const unfolded = icsString.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let currentEvent: Partial<ParsedEvent> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {
        uid: "",
        title: "",
        description: null,
        location: null,
        isAllDay: false,
        recurrenceRule: null,
        recurrenceEnd: null,
      };
      continue;
    }

    if (trimmed === "END:VEVENT") {
      inEvent = false;
      if (currentEvent.uid && currentEvent.startDate) {
        // If no end date, default to start date + 1 hour (or same day for all-day)
        if (!currentEvent.endDate) {
          currentEvent.endDate = currentEvent.isAllDay
            ? new Date(currentEvent.startDate.getTime() + 24 * 60 * 60 * 1000)
            : new Date(currentEvent.startDate.getTime() + 60 * 60 * 1000);
        }
        events.push(currentEvent as ParsedEvent);
      }
      continue;
    }

    if (!inEvent) continue;

    // Parse property:value pairs
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const propPart = trimmed.substring(0, colonIndex);
    const value = trimmed.substring(colonIndex + 1);

    // Extract property name (before any parameters like ;TZID=...)
    const propName = propPart.split(";")[0].toUpperCase();

    switch (propName) {
      case "UID":
        currentEvent.uid = value;
        break;
      case "SUMMARY":
        currentEvent.title = unescapeICalValue(value);
        break;
      case "DESCRIPTION":
        currentEvent.description = unescapeICalValue(value) || null;
        break;
      case "LOCATION":
        currentEvent.location = unescapeICalValue(value) || null;
        break;
      case "DTSTART": {
        const { date, isAllDay } = parseICalDate(propPart, value);
        currentEvent.startDate = date;
        currentEvent.isAllDay = isAllDay;
        break;
      }
      case "DTEND": {
        const { date } = parseICalDate(propPart, value);
        currentEvent.endDate = date;
        break;
      }
      case "DURATION": {
        if (currentEvent.startDate) {
          const durationMs = parseDuration(value);
          currentEvent.endDate = new Date(
            currentEvent.startDate.getTime() + durationMs
          );
        }
        break;
      }
      case "RRULE": {
        const parsed = parseRRule(value);
        if (parsed.rule) {
          currentEvent.recurrenceRule = parsed.rule;
        }
        if (parsed.until) {
          currentEvent.recurrenceEnd = parsed.until;
        }
        break;
      }
    }
  }

  return events;
}

/**
 * Parse an iCal date/datetime string.
 */
function parseICalDate(
  propPart: string,
  value: string
): { date: Date; isAllDay: boolean } {
  // Check for VALUE=DATE (all-day event)
  const isAllDay =
    propPart.includes("VALUE=DATE") && !propPart.includes("VALUE=DATE-TIME");

  if (isAllDay || value.length === 8) {
    // Format: YYYYMMDD
    const year = parseInt(value.substring(0, 4));
    const month = parseInt(value.substring(4, 6)) - 1;
    const day = parseInt(value.substring(6, 8));
    return { date: new Date(year, month, day), isAllDay: true };
  }

  // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const year = parseInt(value.substring(0, 4));
  const month = parseInt(value.substring(4, 6)) - 1;
  const day = parseInt(value.substring(6, 8));
  const hour = parseInt(value.substring(9, 11));
  const minute = parseInt(value.substring(11, 13));
  const second = parseInt(value.substring(13, 15)) || 0;

  if (value.endsWith("Z")) {
    return { date: new Date(Date.UTC(year, month, day, hour, minute, second)), isAllDay: false };
  }

  // Local time (or with TZID - we treat as local for simplicity)
  return { date: new Date(year, month, day, hour, minute, second), isAllDay: false };
}

/**
 * Parse an iCal DURATION string (e.g., PT1H30M, P1D).
 */
function parseDuration(value: string): number {
  let ms = 0;
  const match = value.match(
    /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/
  );
  if (match) {
    const days = parseInt(match[1]) || 0;
    const hours = parseInt(match[2]) || 0;
    const minutes = parseInt(match[3]) || 0;
    const seconds = parseInt(match[4]) || 0;
    ms =
      days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000;
  }
  return ms;
}

/**
 * Parse an RRULE value into our simplified recurrence model.
 */
function parseRRule(value: string): {
  rule: string | null;
  until: Date | null;
} {
  const parts = value.split(";");
  let rule: string | null = null;
  let until: Date | null = null;

  for (const part of parts) {
    const [key, val] = part.split("=");
    if (key === "FREQ") {
      // Map iCal frequencies to our simplified model
      switch (val) {
        case "DAILY":
          rule = "DAILY";
          break;
        case "WEEKLY":
          rule = "WEEKLY";
          break;
        case "MONTHLY":
          rule = "MONTHLY";
          break;
        case "YEARLY":
          rule = "YEARLY";
          break;
        // Other frequencies (SECONDLY, MINUTELY, HOURLY) not supported
      }
    }
    if (key === "UNTIL" && val) {
      const { date } = parseICalDate("", val);
      until = date;
    }
  }

  return { rule, until };
}

/**
 * Unescape iCal text values.
 */
function unescapeICalValue(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Generate an iCal (.ics) string from events.
 */
export function generateICS(
  events: Array<{
    title: string;
    description?: string | null;
    location?: string | null;
    startDate: Date | string;
    endDate: Date | string;
    isAllDay: boolean;
    recurrenceRule?: string | null;
    recurrenceEnd?: Date | string | null;
    id: string;
  }>,
  calendarName: string
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyLifeSystem//Calendar//NL",
    `X-WR-CALNAME:${escapeICalValue(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@mylifesystem`);
    lines.push(`DTSTAMP:${formatICalDateTime(new Date())}`);

    if (event.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatICalDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatICalDate(end)}`);
    } else {
      lines.push(`DTSTART:${formatICalDateTime(start)}`);
      lines.push(`DTEND:${formatICalDateTime(end)}`);
    }

    lines.push(`SUMMARY:${escapeICalValue(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalValue(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeICalValue(event.location)}`);
    }

    if (event.recurrenceRule) {
      let rrule = `RRULE:FREQ=${event.recurrenceRule}`;
      if (event.recurrenceEnd) {
        rrule += `;UNTIL=${formatICalDateTime(new Date(event.recurrenceEnd))}`;
      }
      lines.push(rrule);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatICalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatICalDateTime(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}`;
}

function escapeICalValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
