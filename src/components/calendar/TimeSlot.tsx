"use client";

import { CalendarEvent } from "@/lib/types/calendar";
import { isToday } from "@/lib/calendar";
import EventChip from "./EventChip";

interface TimeSlotProps {
  hour: number;
  date: Date;
  events: CalendarEvent[];
  getEventColor: (event: CalendarEvent) => string;
  onClickSlot: (date: Date, hour: number) => void;
  onClickEvent: (event: CalendarEvent) => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: Date, hour: number) => void;
  slotHeight?: number;
  now: Date;
  layoutInfo?: Map<string, { colIndex: number; totalCols: number }>;
}

export default function TimeSlot({
  hour,
  date,
  events,
  getEventColor,
  onClickSlot,
  onClickEvent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  slotHeight = 40,
  now,
  layoutInfo,
}: TimeSlotProps) {
  const today = isToday(date);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Is this entire slot in the past?
  const slotIsPast = isSlotPast(date, hour, now);

  // Show the red time indicator in this slot?
  const showTimeIndicator = today && hour === currentHour;
  const indicatorOffset = (currentMinute / 60) * slotHeight;

  return (
    <div
      onClick={() => onClickSlot(date, hour)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date, hour)}
      className={`border-b border-r border-border relative cursor-pointer hover:bg-overlay/50 transition-colors group ${
        slotIsPast ? "bg-muted-foreground/[0.03]" : ""
      }`}
      style={{ height: `${slotHeight}px` }}
    >
      {/* Current time red indicator line */}
      {showTimeIndicator && (
        <div
          className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
          style={{ top: `${indicatorOffset}px` }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500 -ml-[6px] shrink-0 shadow-sm" />
          <div className="flex-1 h-[2px] bg-red-500 shadow-sm" />
        </div>
      )}

      {/* Events */}
      {events.map((event) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;

        // Only render the event in its starting hour slot
        if (Math.floor(startHour) !== hour) return null;

        const topOffset = (startHour - hour) * slotHeight;
        const height = Math.max((endHour - startHour) * slotHeight - 2, 16);
        const isPast = end < now;

        const eventKey = event._virtualId || event.id;
        const layout = layoutInfo?.get(eventKey);
        const colIndex = layout?.colIndex ?? 0;
        const totalCols = layout?.totalCols ?? 1;
        const leftPct = (colIndex / totalCols) * 100;
        const widthPct = (1 / totalCols) * 100;

        return (
          <div
            key={eventKey}
            className="absolute z-10"
            style={{
              top: `${topOffset}px`,
              height: `${height}px`,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EventChip
              event={event}
              color={getEventColor(event)}
              variant="block"
              onClick={() => onClickEvent(event)}
              onDragStart={(e) => onDragStart(e, event)}
              isPast={isPast}
            />
          </div>
        );
      })}
    </div>
  );
}

function isSlotPast(date: Date, hour: number, now: Date): boolean {
  const slotEnd = new Date(date);
  slotEnd.setHours(hour + 1, 0, 0, 0);
  return slotEnd < now;
}
