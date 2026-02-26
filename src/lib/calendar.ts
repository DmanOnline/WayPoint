// Calendar utility functions

/**
 * Get the month grid for a given year/month.
 * Returns an array of weeks, each week containing 7 Date objects.
 * Starts on Monday (Dutch convention).
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of week for the first day (Monday = 0)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  // Start from the Monday before or on the first day
  const gridStart = new Date(year, month, 1 - startDayOfWeek);

  const weeks: Date[][] = [];
  const current = new Date(gridStart);

  // Generate 6 weeks to cover all possible month layouts
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);

    // Stop if the entire next week is in the next month
    if (current.getMonth() !== month && current.getDay() === 1) break;
  }

  // Remove trailing week if all dates are in next month
  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek.every((d) => d.getMonth() !== month)) {
    weeks.pop();
  }

  return weeks;
}

/**
 * Get the 7 days of the week containing the given date.
 * Week starts on Monday.
 */
export function getWeekDays(date: Date): Date[] {
  const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Format a date in Dutch locale.
 */
export function formatDateNL(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return date.toLocaleDateString("nl-NL", options);
}

/**
 * Format time as HH:mm.
 */
export function formatTimeNL(date: Date): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Dutch day abbreviations (Monday first).
 */
export const DAY_NAMES_SHORT = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

/**
 * Dutch month names.
 */
export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

/**
 * Get ISO 8601 week number for a given date.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Check if two dates are the same day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Get a date string in YYYY-MM-DD format.
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get a time string in HH:mm format.
 */
export function toTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Determine if text should be white or dark based on background color luminance.
 */
export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1f2937" : "#ffffff";
}

/**
 * Advance a date by the given recurrence rule.
 */
export function advanceDate(
  date: Date,
  rule: string
): Date {
  const next = new Date(date);
  switch (rule) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Expand recurring events into virtual occurrences within a date range.
 */
export function expandRecurrences(
  event: {
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    recurrenceRule: string;
    recurrenceEnd: Date | string | null;
  },
  rangeStart: Date,
  rangeEnd: Date,
  exceptionDates: Set<string> // Set of ISO date strings (YYYY-MM-DD) that have exceptions
): Array<{ start: Date; end: Date; virtualId: string }> {
  const results: Array<{ start: Date; end: Date; virtualId: string }> = [];
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  const duration = eventEnd.getTime() - eventStart.getTime();

  const limit = event.recurrenceEnd
    ? new Date(
        Math.min(
          new Date(event.recurrenceEnd).getTime(),
          rangeEnd.getTime()
        )
      )
    : rangeEnd;

  let current = new Date(eventStart);
  let iterations = 0;

  while (current <= limit && iterations < 1000) {
    const occurrenceEnd = new Date(current.getTime() + duration);

    if (occurrenceEnd >= rangeStart && current <= rangeEnd) {
      const dateKey = toDateString(current);

      if (!exceptionDates.has(dateKey)) {
        results.push({
          start: new Date(current),
          end: new Date(occurrenceEnd),
          virtualId: `${event.id}__${dateKey}`,
        });
      }
    }

    current = advanceDate(current, event.recurrenceRule);
    iterations++;
  }

  return results;
}

/**
 * Get the start and end dates for the visible range of a month view.
 */
export function getMonthRange(
  year: number,
  month: number
): { start: Date; end: Date } {
  const grid = getMonthGrid(year, month);
  const start = grid[0][0];
  const lastWeek = grid[grid.length - 1];
  const end = lastWeek[6];
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get the start and end dates for a week view.
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const days = getWeekDays(date);
  const start = new Date(days[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(days[6]);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Available event colors with labels.
 */
export const EVENT_COLORS = [
  { value: "#6C63FF", label: "Indigo" },
  { value: "#8b5cf6", label: "Paars" },
  { value: "#3b82f6", label: "Blauw" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#10b981", label: "Groen" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#f97316", label: "Oranje" },
  { value: "#ef4444", label: "Rood" },
  { value: "#ec4899", label: "Roze" },
  { value: "#64748b", label: "Grijs" },
];
