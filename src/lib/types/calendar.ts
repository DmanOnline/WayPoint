export type RecurrenceRule = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type CalendarView = "month" | "week";

export interface SubCalendar {
  id: string;
  userId: string;
  name: string;
  color: string;
  isVisible: boolean;
  sortOrder: number;
  icalUrl: string | null;
  lastSyncedAt: string | null;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  subCalendarId: string;
  subCalendar?: SubCalendar;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  recurrenceRule: RecurrenceRule | null;
  recurrenceEnd: string | null;
  parentEventId: string | null;
  originalDate: string | null;
  icalUid: string | null;
  isLocallyModified: boolean;
  isLocallyDeleted: boolean;
  // Virtual fields for expanded recurring events
  _virtualId?: string;
  _isVirtual?: boolean;
}

export interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  event?: CalendarEvent;
  defaultDate?: string;
  defaultTime?: string;
}

export interface SubCalendarModalState {
  open: boolean;
  mode: "create" | "edit" | "link";
  subCalendar?: SubCalendar;
}

export interface DragData {
  eventId: string;
  virtualId?: string;
  originalStart: string;
  originalEnd: string;
  isRecurring: boolean;
}

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  subCalendarId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  recurrenceRule: RecurrenceRule | null;
  recurrenceEnd: string;
}
