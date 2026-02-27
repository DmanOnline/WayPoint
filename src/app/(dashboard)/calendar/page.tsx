"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarEvent,
  SubCalendar,
  CalendarView,
  ModalState,
  SubCalendarModalState,
  EventFormData,
} from "@/lib/types/calendar";
import {
  getMonthRange,
  getWeekRange,
  toDateString,
} from "@/lib/calendar";

import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import EventModal from "@/components/calendar/EventModal";
import SubCalendarModal from "@/components/calendar/SubCalendarModal";

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [subCalendars, setSubCalendars] = useState<SubCalendar[]>([]);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(40);
  const [calSidebarOpen, setCalSidebarOpen] = useState(false);

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
  });

  const [subCalModalState, setSubCalModalState] =
    useState<SubCalendarModalState>({
      open: false,
      mode: "create",
    });

  // Fetch sub-calendars
  const fetchSubCalendars = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/sub-calendars");
      if (res.ok) {
        const data = await res.json();
        setSubCalendars(data.subCalendars);
        return data.subCalendars as SubCalendar[];
      }
    } catch (err) {
      console.error("Failed to fetch sub-calendars:", err);
    }
    return [];
  }, []);

  // Fetch events for current view range
  const fetchEvents = useCallback(async () => {
    const range =
      view === "month"
        ? getMonthRange(currentDate.getFullYear(), currentDate.getMonth())
        : getWeekRange(currentDate);

    try {
      const res = await fetch(
        `/api/calendar/events?start=${range.start.toISOString()}&end=${range.end.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  }, [currentDate, view]);

  // Sync iCal calendars that haven't been synced recently
  const autoSyncLinkedCalendars = useCallback(
    async (calendars: SubCalendar[]) => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const promises: Promise<void>[] = [];
      for (const cal of calendars) {
        if (
          cal.icalUrl &&
          (!cal.lastSyncedAt || new Date(cal.lastSyncedAt) < fiveMinutesAgo)
        ) {
          promises.push(syncCalendar(cal.id));
        }
      }
      await Promise.all(promises);
    },
    []
  );

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      const cals = await fetchSubCalendars();
      // Auto-sync linked calendars BEFORE showing UI
      await autoSyncLinkedCalendars(cals);
      await fetchEvents();
      setLoading(false);
    }
    init();
  }, []);

  // Refetch events when date/view changes
  useEffect(() => {
    fetchEvents();
  }, [currentDate, view, fetchEvents]);

  // Navigation
  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(new Date());
      return;
    }

    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(
        newDate.getMonth() + (direction === "next" ? 1 : -1)
      );
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  // Get event color from its sub-calendar
  const getEventColor = (event: CalendarEvent): string => {
    const cal = subCalendars.find((c) => c.id === event.subCalendarId);
    return cal?.color || "#6C63FF";
  };

  // Click on a day (month view) → create event
  const handleClickDay = (date: Date) => {
    setModalState({
      open: true,
      mode: "create",
      defaultDate: toDateString(date),
    });
  };

  // Click on a time slot (week view) → create event
  const handleClickSlot = (date: Date, hour: number) => {
    setModalState({
      open: true,
      mode: "create",
      defaultDate: toDateString(date),
      defaultTime: `${String(hour).padStart(2, "0")}:00`,
    });
  };

  // Click on an event → edit, or navigate for people events
  const handleClickEvent = (event: CalendarEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ev = event as any;
    if ((ev._isBirthday || ev._isFollowUp) && ev._personId) {
      router.push(`/people?person=${ev._personId}`);
      return;
    }
    setModalState({
      open: true,
      mode: "edit",
      event,
    });
  };

  // Save event (create or update)
  const handleSaveEvent = async (
    formData: EventFormData,
    editMode?: "this" | "all"
  ) => {
    const startDate = formData.isAllDay
      ? `${formData.startDate}T00:00:00`
      : `${formData.startDate}T${formData.startTime}:00`;
    const endDate = formData.isAllDay
      ? `${formData.endDate}T23:59:59`
      : `${formData.endDate}T${formData.endTime}:00`;

    if (modalState.mode === "create") {
      await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          subCalendarId: formData.subCalendarId,
          startDate,
          endDate,
          isAllDay: formData.isAllDay,
          recurrenceRule: formData.recurrenceRule,
          recurrenceEnd: formData.recurrenceEnd || null,
        }),
      });
    } else if (modalState.event) {
      const eventId = modalState.event._isVirtual
        ? modalState.event.id // parent event ID for virtual
        : modalState.event.id;

      await fetch(`/api/calendar/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          subCalendarId: formData.subCalendarId,
          startDate,
          endDate,
          isAllDay: formData.isAllDay,
          recurrenceRule: formData.recurrenceRule,
          recurrenceEnd: formData.recurrenceEnd || null,
          editMode,
          originalDate: modalState.event._isVirtual
            ? modalState.event._virtualId?.split("__")[1]
            : undefined,
        }),
      });
    }

    await fetchEvents();
  };

  // Delete event
  const handleDeleteEvent = async (
    event: CalendarEvent,
    deleteMode: "this" | "all" | "future"
  ) => {
    const eventId = event._isVirtual ? event.id : event.id;
    const originalDate = event._isVirtual
      ? event._virtualId?.split("__")[1]
      : undefined;

    const res = await fetch(
      `/api/calendar/events/${eventId}?deleteMode=${deleteMode}${
        originalDate ? `&originalDate=${originalDate}` : ""
      }`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      console.error("Delete failed:", res.status, await res.text());
      // Refetch to get current state
      await fetchEvents();
      throw new Error("Verwijderen mislukt, probeer het opnieuw");
    }

    await fetchEvents();
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        eventId: event.id,
        virtualId: event._virtualId,
        originalStart: event.startDate,
        originalEnd: event.endDate,
        isRecurring: !!(event.recurrenceRule || event._isVirtual),
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const target = e.currentTarget as HTMLElement;
    target.classList.add("ring-2", "ring-accent/50", "bg-accent/5");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-accent/50", "bg-accent/5");
  };

  const handleDropOnDay = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-accent/50", "bg-accent/5");

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const origStart = new Date(data.originalStart);
      const origEnd = new Date(data.originalEnd);
      const duration = origEnd.getTime() - origStart.getTime();

      const newStart = new Date(date);
      newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      const body: Record<string, unknown> = {
        newStartDate: newStart.toISOString(),
        newEndDate: newEnd.toISOString(),
      };

      if (data.isRecurring) {
        const originalDate = data.virtualId?.split("__")[1];
        body.editMode = "this";
        body.originalDate = originalDate;
      }

      // Optimistic update
      setEvents((prev) =>
        prev.map((ev) => {
          const matchId = data.virtualId || data.eventId;
          const evId = ev._virtualId || ev.id;
          if (evId === matchId) {
            return { ...ev, startDate: newStart.toISOString(), endDate: newEnd.toISOString() };
          }
          return ev;
        })
      );

      await fetch(`/api/calendar/events/${data.eventId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await fetchEvents();
    } catch (err) {
      console.error("Drop failed:", err);
      await fetchEvents(); // Revert
    }
  };

  const handleDropOnSlot = async (
    e: React.DragEvent,
    date: Date,
    hour: number
  ) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-accent/50", "bg-accent/5");

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const origStart = new Date(data.originalStart);
      const origEnd = new Date(data.originalEnd);
      const duration = origEnd.getTime() - origStart.getTime();

      const newStart = new Date(date);
      newStart.setHours(hour, 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      const body: Record<string, unknown> = {
        newStartDate: newStart.toISOString(),
        newEndDate: newEnd.toISOString(),
      };

      if (data.isRecurring) {
        const originalDate = data.virtualId?.split("__")[1];
        body.editMode = "this";
        body.originalDate = originalDate;
      }

      await fetch(`/api/calendar/events/${data.eventId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await fetchEvents();
    } catch (err) {
      console.error("Drop failed:", err);
    }
  };

  // Sub-calendar operations
  const handleToggleVisibility = async (id: string, isVisible: boolean) => {
    // Optimistic update
    setSubCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isVisible } : c))
    );

    await fetch(`/api/calendar/sub-calendars/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    });

    await fetchEvents();
  };

  const handleSaveSubCalendar = async (data: {
    name: string;
    color: string;
    icalUrl?: string;
  }) => {
    if (subCalModalState.mode === "edit" && subCalModalState.subCalendar) {
      const res = await fetch(
        `/api/calendar/sub-calendars/${subCalModalState.subCalendar.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
    } else {
      const res = await fetch("/api/calendar/sub-calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      // If it's a linked calendar, sync it immediately
      if (data.icalUrl) {
        const result = await res.json();
        await syncCalendar(result.subCalendar.id);
      }
    }

    await fetchSubCalendars();
    await fetchEvents();
  };

  const handleDeleteSubCalendar = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze kalender wilt verwijderen? Alle evenementen worden ook verwijderd.")) {
      return;
    }

    await fetch(`/api/calendar/sub-calendars/${id}`, { method: "DELETE" });
    await fetchSubCalendars();
    await fetchEvents();
  };

  const syncCalendar = async (id: string) => {
    setSyncingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/calendar/sub-calendars/${id}/sync`, {
        method: "POST",
      });
      await fetchSubCalendars();
      await fetchEvents();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExportCalendar = (id: string) => {
    window.open(`/api/calendar/export?subCalendarId=${id}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Calendar Sidebar */}
      <CalendarSidebar
        subCalendars={subCalendars}
        onToggleVisibility={handleToggleVisibility}
        onNewCalendar={() => {
          setCalSidebarOpen(false);
          setSubCalModalState({ open: true, mode: "create" });
        }}
        onLinkIcal={() => {
          setCalSidebarOpen(false);
          setSubCalModalState({ open: true, mode: "link" });
        }}
        onEditCalendar={(cal) => {
          setCalSidebarOpen(false);
          setSubCalModalState({ open: true, mode: "edit", subCalendar: cal });
        }}
        onDeleteCalendar={handleDeleteSubCalendar}
        onSyncCalendar={syncCalendar}
        onExportCalendar={handleExportCalendar}
        syncingIds={syncingIds}
        mobileOpen={calSidebarOpen}
        onMobileClose={() => setCalSidebarOpen(false)}
      />

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden min-w-0">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onNavigate={handleNavigate}
          onNewEvent={() =>
            setModalState({
              open: true,
              mode: "create",
              defaultDate: toDateString(new Date()),
            })
          }
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          onToggleSidebar={() => setCalSidebarOpen(true)}
        />

        {view === "month" ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            getEventColor={getEventColor}
            onClickDay={handleClickDay}
            onClickEvent={handleClickEvent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnDay}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            events={events}
            getEventColor={getEventColor}
            onClickSlot={handleClickSlot}
            onClickEvent={handleClickEvent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnSlot}
            slotHeight={zoomLevel}
          />
        )}
      </div>

      {/* Event Modal */}
      <EventModal
        modalState={modalState}
        subCalendars={subCalendars}
        onClose={() => setModalState({ open: false, mode: "create" })}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Sub-Calendar Modal */}
      <SubCalendarModal
        modalState={subCalModalState}
        onClose={() => setSubCalModalState({ open: false, mode: "create" })}
        onSave={handleSaveSubCalendar}
      />
    </div>
  );
}
