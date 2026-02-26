"use client";

import { useEffect, useRef, useState } from "react";
import { getWeekDays, getWeekNumber, DAY_NAMES_SHORT, isToday } from "@/lib/calendar";
import { CalendarEvent } from "@/lib/types/calendar";
import TimeSlot from "./TimeSlot";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getEventColor: (event: CalendarEvent) => string;
  onClickSlot: (date: Date, hour: number) => void;
  onClickEvent: (event: CalendarEvent) => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: Date, hour: number) => void;
  slotHeight?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView({
  currentDate,
  events,
  getEventColor,
  onClickSlot,
  onClickEvent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  slotHeight = 40,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const days = getWeekDays(currentDate);

  // Current time - updates every minute
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current && !hasScrolled.current) {
      const currentHour = new Date().getHours();
      const scrollTo = Math.max(0, (currentHour - 1) * slotHeight);
      scrollRef.current.scrollTop = scrollTo;
      hasScrolled.current = true;
    }
  }, [slotHeight]);

  // Get events for a specific day and hour
  function getEventsForSlot(date: Date, hour: number): CalendarEvent[] {
    return events.filter((event) => {
      if (event.isAllDay) return false;
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);

      if (
        start.getFullYear() !== date.getFullYear() ||
        start.getMonth() !== date.getMonth() ||
        start.getDate() !== date.getDate()
      ) {
        return false;
      }

      return Math.floor(start.getHours() + start.getMinutes() / 60) === hour ||
        (start.getHours() < hour && end.getHours() >= hour);
    });
  }

  // Get all-day events for a specific day
  function getAllDayEvents(date: Date): CalendarEvent[] {
    return events.filter((event) => {
      if (!event.isAllDay) return false;
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      return start <= dayEnd && end >= dayStart;
    });
  }

  // Check if a day is in the past (before today)
  function isDayPast(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border shrink-0">
        <div className="p-2 flex items-center justify-center">
          <span className="text-xs font-semibold text-muted-foreground" title="Weeknummer">
            W{getWeekNumber(days[0])}
          </span>
        </div>
        {days.map((date, i) => {
          const today = isToday(date);
          const past = isDayPast(date);
          return (
            <div
              key={i}
              className={`p-2 text-center border-l border-border ${today ? "bg-accent/5" : ""} ${past ? "opacity-50" : ""}`}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {DAY_NAMES_SHORT[i]}
              </div>
              <div
                className={`text-lg font-bold mt-0.5 ${
                  today
                    ? "text-accent"
                    : "text-foreground"
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {days.some((d) => getAllDayEvents(d).length > 0) && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border shrink-0">
          <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 pt-2">
            Hele dag
          </div>
          {days.map((date, i) => {
            const allDayEvents = getAllDayEvents(date);
            const past = isDayPast(date);
            return (
              <div key={i} className={`p-1 border-l border-border min-h-[32px] ${past ? "opacity-40" : ""}`}>
                {allDayEvents.map((event) => (
                  <AllDayChip
                    key={event._virtualId || event.id}
                    event={event}
                    color={getEventColor(event)}
                    onClick={() => onClickEvent(event)}
                    onDragStart={(e) => onDragStart(e, event)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div
                className="text-right pr-2 text-xs text-muted-foreground border-b border-border flex items-start pt-0.5"
                style={{ height: `${slotHeight}px` }}
              >
                <span className="ml-auto">{String(hour).padStart(2, "0")}:00</span>
              </div>
              {/* Day slots */}
              {days.map((date, dayIndex) => (
                <TimeSlot
                  key={`${hour}-${dayIndex}`}
                  hour={hour}
                  date={date}
                  events={getEventsForSlot(date, hour)}
                  getEventColor={getEventColor}
                  onClickSlot={onClickSlot}
                  onClickEvent={onClickEvent}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  slotHeight={slotHeight}
                  now={now}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple inline EventChip for all-day events row
function AllDayChip({
  event,
  color,
  onClick,
  onDragStart,
}: {
  event: CalendarEvent;
  color: string;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity mb-0.5"
      style={{ backgroundColor: `${color}30`, color }}
      title={event.title}
    >
      {event.title}
    </div>
  );
}
