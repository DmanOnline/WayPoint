"use client";

import { isToday, isSameDay } from "@/lib/calendar";
import { CalendarEvent } from "@/lib/types/calendar";
import EventChip from "./EventChip";

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  getEventColor: (event: CalendarEvent) => string;
  onClickDay: (date: Date) => void;
  onClickEvent: (event: CalendarEvent) => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
}

export default function DayCell({
  date,
  isCurrentMonth,
  events,
  getEventColor,
  onClickDay,
  onClickEvent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: DayCellProps) {
  const today = isToday(date);
  const dayNumber = date.getDate();
  const maxVisible = 3;
  const visibleEvents = events.slice(0, maxVisible);
  const overflowCount = events.length - maxVisible;

  return (
    <div
      onClick={() => onClickDay(date)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date)}
      className={`min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer transition-colors hover:bg-overlay group
        ${!isCurrentMonth ? "opacity-40" : ""}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full
            ${
              today
                ? "bg-accent text-white"
                : "text-foreground group-hover:bg-overlay"
            }
          `}
        >
          {dayNumber}
        </span>
      </div>

      <div className="space-y-0.5">
        {visibleEvents.map((event) => (
          <EventChip
            key={event._virtualId || event.id}
            event={event}
            color={getEventColor(event)}
            variant="compact"
            onClick={() => onClickEvent(event)}
            onDragStart={(e) => onDragStart(e, event)}
          />
        ))}
        {overflowCount > 0 && (
          <div className="text-[10px] text-muted-foreground px-1.5 font-medium">
            +{overflowCount} meer
          </div>
        )}
      </div>
    </div>
  );
}
