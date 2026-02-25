"use client";

import { CalendarEvent } from "@/lib/types/calendar";
import { getContrastColor, formatTimeNL } from "@/lib/calendar";

interface EventChipProps {
  event: CalendarEvent;
  color: string;
  variant?: "compact" | "block";
  onClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function EventChip({
  event,
  color,
  variant = "compact",
  onClick,
  onDragStart,
}: EventChipProps) {
  const textColor = getContrastColor(color);
  const startTime = !event.isAllDay
    ? formatTimeNL(new Date(event.startDate))
    : null;
  const endTime = !event.isAllDay
    ? formatTimeNL(new Date(event.endDate))
    : null;

  if (variant === "block") {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        className="rounded-md px-2 py-1 text-xs cursor-pointer hover:opacity-90 transition-opacity overflow-hidden h-full"
        style={{ backgroundColor: color, color: textColor }}
        title={event.title}
      >
        <div className="font-medium truncate">{event.title}</div>
        {startTime && endTime && (
          <div className="opacity-80 text-[10px]">{startTime} – {endTime}</div>
        )}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity truncate"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
      title={event.title}
    >
      {startTime && (
        <span className="font-medium text-[10px] shrink-0">{startTime}</span>
      )}
      <span className="font-medium truncate">{event.title}</span>
    </div>
  );
}
