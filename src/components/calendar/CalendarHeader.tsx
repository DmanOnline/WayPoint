"use client";

import { MONTH_NAMES } from "@/lib/calendar";
import { CalendarView } from "@/lib/types/calendar";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onNewEvent: () => void;
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
  onToggleSidebar?: () => void;
}

const ZOOM_LEVELS = [
  { value: 20, label: "Compact" },
  { value: 30, label: "Klein" },
  { value: 40, label: "Normaal" },
  { value: 60, label: "Groot" },
  { value: 80, label: "Extra groot" },
];

export default function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onNewEvent,
  zoomLevel = 40,
  onZoomChange,
  onToggleSidebar,
}: CalendarHeaderProps) {
  const monthName = MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-overlay text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Kalenders"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate("prev")}
            className="p-2 rounded-lg hover:bg-overlay text-muted-foreground hover:text-foreground transition-colors"
            title="Vorige"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate("next")}
            className="p-2 rounded-lg hover:bg-overlay text-muted-foreground hover:text-foreground transition-colors"
            title="Volgende"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => onNavigate("today")}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-overlay text-foreground transition-colors hidden sm:block"
        >
          Vandaag
        </button>
        <h2 className="text-lg md:text-xl font-bold text-foreground ml-1 md:ml-2">
          {monthName} {year}
        </h2>
      </div>

      {/* Right: Zoom + View toggle + New event */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Zoom controls (only in week view, hidden on small screens) */}
        {view === "week" && onZoomChange && (
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
            <button
              onClick={() => {
                const idx = ZOOM_LEVELS.findIndex((z) => z.value === zoomLevel);
                if (idx > 0) onZoomChange(ZOOM_LEVELS[idx - 1].value);
              }}
              disabled={zoomLevel === ZOOM_LEVELS[0].value}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Uitzoomen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" />
              </svg>
            </button>
            <span className="text-xs text-muted-foreground px-1 min-w-[50px] text-center">
              {ZOOM_LEVELS.find((z) => z.value === zoomLevel)?.label}
            </span>
            <button
              onClick={() => {
                const idx = ZOOM_LEVELS.findIndex((z) => z.value === zoomLevel);
                if (idx < ZOOM_LEVELS.length - 1) onZoomChange(ZOOM_LEVELS[idx + 1].value);
              }}
              disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1].value}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Inzoomen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
              </svg>
            </button>
          </div>
        )}

        {/* View toggle */}
        <div className="flex rounded-lg border border-border bg-surface p-0.5">
          <button
            onClick={() => onViewChange("month")}
            className={`px-2.5 md:px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === "month"
                ? "bg-accent text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Maand
          </button>
          <button
            onClick={() => onViewChange("week")}
            className={`px-2.5 md:px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === "week"
                ? "bg-accent text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Week
          </button>
        </div>

        {/* New event button */}
        <button
          onClick={onNewEvent}
          className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">Nieuw Evenement</span>
        </button>
      </div>
    </div>
  );
}
