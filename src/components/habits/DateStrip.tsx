"use client";

import { useRef, useEffect } from "react";
import { addDays, toDateString, isFutureDate } from "@/lib/habits";

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  completionsByDate?: Map<string, number>; // dateStr -> count of completed habits
  totalByDate?: Map<string, number>; // dateStr -> total habits due
}

const DAY_NAMES = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export default function DateStrip({
  selectedDate,
  onSelectDate,
  completionsByDate,
  totalByDate,
}: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const today = new Date();
  const todayStr = toDateString(today);
  const selectedStr = toDateString(selectedDate);

  // Generate 60 days: 30 past + today + 29 future
  const days: Date[] = [];
  for (let i = -30; i <= 29; i++) {
    days.push(addDays(today, i));
  }

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = todayRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollLeft = elementRect.left - containerRect.left - containerRect.width / 2 + elementRect.width / 2 + container.scrollLeft;
      container.scrollTo({ left: scrollLeft, behavior: "instant" });
    }
  }, []);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {days.map((day) => {
          const dateStr = toDateString(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const isFuture = isFutureDate(day);
          const dayName = DAY_NAMES[day.getDay()];
          const dayNum = day.getDate();
          const showMonth = dayNum === 1 || days.indexOf(day) === 0;

          const completed = completionsByDate?.get(dateStr) || 0;
          const total = totalByDate?.get(dateStr) || 0;
          const allDone = total > 0 && completed >= total;

          return (
            <button
              key={dateStr}
              ref={isToday ? todayRef : undefined}
              onClick={() => onSelectDate(day)}
              className={`shrink-0 flex flex-col items-center w-11 py-1.5 rounded-xl transition-all ${
                isSelected
                  ? "bg-accent text-white shadow-sm"
                  : isToday
                  ? "bg-accent/10 text-accent"
                  : isFuture
                  ? "text-muted-foreground/30"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {showMonth && (
                <span className={`text-[9px] font-medium mb-0.5 ${isSelected ? "text-white/70" : "text-muted-foreground/60"}`}>
                  {MONTH_NAMES[day.getMonth()]}
                </span>
              )}
              <span className={`text-[10px] ${isSelected ? "text-white/80" : ""}`}>
                {dayName}
              </span>
              <span className={`text-sm font-semibold leading-tight ${isSelected ? "text-white" : ""}`}>
                {dayNum}
              </span>
              {/* Completion dot indicator */}
              <div className="h-1.5 mt-0.5">
                {total > 0 && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected
                        ? allDone ? "bg-white" : "bg-white/40"
                        : allDone ? "bg-emerald-500" : completed > 0 ? "bg-amber-400" : "bg-border"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
