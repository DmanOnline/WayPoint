"use client";

import { getMonthGrid, DAY_NAMES_SHORT, isSameDay } from "@/lib/calendar";
import { CalendarEvent } from "@/lib/types/calendar";
import DayCell from "./DayCell";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getEventColor: (event: CalendarEvent) => string;
  onClickDay: (date: Date) => void;
  onClickEvent: (event: CalendarEvent) => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
}

export default function MonthView({
  currentDate,
  events,
  getEventColor,
  onClickDay,
  onClickEvent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: MonthViewProps) {
  const grid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());

  // Get events for a specific day
  function getEventsForDay(date: Date): CalendarEvent[] {
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      // Event spans this day if: start <= day end AND end >= day start
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      return start <= dayEnd && end >= dayStart;
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES_SHORT.map((day) => (
          <div
            key={day}
            className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {grid.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7">
          {week.map((date, dayIndex) => (
            <DayCell
              key={`${weekIndex}-${dayIndex}`}
              date={date}
              isCurrentMonth={date.getMonth() === currentDate.getMonth()}
              events={getEventsForDay(date)}
              getEventColor={getEventColor}
              onClickDay={onClickDay}
              onClickEvent={onClickEvent}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
