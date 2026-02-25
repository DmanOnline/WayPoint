"use client";

import { CalendarEvent } from "@/lib/types/calendar";
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
}: TimeSlotProps) {
  return (
    <div
      onClick={() => onClickSlot(date, hour)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date, hour)}
      className="border-b border-r border-border relative cursor-pointer hover:bg-overlay/50 transition-colors group"
      style={{ height: `${slotHeight}px` }}
    >
      {events.map((event) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;

        // Only render the event in its starting hour slot
        if (Math.floor(startHour) !== hour) return null;

        const topOffset = (startHour - hour) * slotHeight;
        const height = Math.max((endHour - startHour) * slotHeight - 2, 16);

        return (
          <div
            key={event._virtualId || event.id}
            className="absolute left-0.5 right-0.5 z-10"
            style={{
              top: `${topOffset}px`,
              height: `${height}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EventChip
              event={event}
              color={getEventColor(event)}
              variant="block"
              onClick={() => onClickEvent(event)}
              onDragStart={(e) => onDragStart(e, event)}
            />
          </div>
        );
      })}
    </div>
  );
}
