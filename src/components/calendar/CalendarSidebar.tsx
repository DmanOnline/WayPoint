"use client";

import { useState } from "react";
import { SubCalendar } from "@/lib/types/calendar";

interface CalendarSidebarProps {
  subCalendars: SubCalendar[];
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onNewCalendar: () => void;
  onLinkIcal: () => void;
  onEditCalendar: (cal: SubCalendar) => void;
  onDeleteCalendar: (id: string) => void;
  onSyncCalendar: (id: string) => void;
  onExportCalendar: (id: string) => void;
  syncingIds: Set<string>;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function CalendarSidebar({
  subCalendars,
  onToggleVisibility,
  onNewCalendar,
  onLinkIcal,
  onEditCalendar,
  onDeleteCalendar,
  onSyncCalendar,
  onExportCalendar,
  syncingIds,
  mobileOpen = false,
  onMobileClose,
}: CalendarSidebarProps) {
  const ownCalendars = subCalendars.filter((c) => !c.icalUrl);
  const linkedCalendars = subCalendars.filter((c) => c.icalUrl);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-backdrop"
          onClick={onMobileClose}
        />
      )}
      <div className={`w-[240px] shrink-0 border-r border-border bg-card/30 p-4 flex-col gap-4 overflow-y-auto ${mobileOpen ? "flex fixed inset-y-0 left-0 z-50" : "hidden"} md:flex md:relative`}>
      {/* Own calendars */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Mijn Kalenders
        </h3>
        <div className="space-y-1">
          {ownCalendars.map((cal) => (
            <CalendarItem
              key={cal.id}
              calendar={cal}
              onToggle={() => onToggleVisibility(cal.id, !cal.isVisible)}
              onEdit={() => onEditCalendar(cal)}
              onDelete={() => onDeleteCalendar(cal.id)}
              onExport={() => onExportCalendar(cal.id)}
            />
          ))}
        </div>
        <button
          onClick={onNewCalendar}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuwe kalender
        </button>
      </div>

      {/* Linked calendars */}
      {linkedCalendars.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Gelinkte Kalenders
          </h3>
          <div className="space-y-1">
            {linkedCalendars.map((cal) => (
              <CalendarItem
                key={cal.id}
                calendar={cal}
                isLinked
                isSyncing={syncingIds.has(cal.id)}
                onToggle={() => onToggleVisibility(cal.id, !cal.isVisible)}
                onEdit={() => onEditCalendar(cal)}
                onDelete={() => onDeleteCalendar(cal.id)}
                onSync={() => onSyncCalendar(cal.id)}
                onExport={() => onExportCalendar(cal.id)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onLinkIcal}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.756a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.757 8.25" />
        </svg>
        Koppel iCal URL
      </button>
    </div>
    </>
  );
}

function CalendarItem({
  calendar,
  isLinked,
  isSyncing,
  onToggle,
  onEdit,
  onDelete,
  onSync,
  onExport,
}: {
  calendar: SubCalendar;
  isLinked?: boolean;
  isSyncing?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSync?: () => void;
  onExport?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-overlay group relative">
      {/* Colored checkbox */}
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors"
        style={{
          borderColor: calendar.color,
          backgroundColor: calendar.isVisible ? calendar.color : "transparent",
        }}
      >
        {calendar.isVisible && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </button>

      {/* Name */}
      <span className={`text-sm flex-1 truncate ${calendar.isVisible ? "text-foreground" : "text-muted-foreground"}`}>
        {calendar.name}
      </span>

      {/* Sync indicator for linked */}
      {isLinked && isSyncing && (
        <svg className="w-3.5 h-3.5 text-muted-foreground animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
        </svg>
      )}

      {/* Menu button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-overlay"
      >
        <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
            <button
              onClick={() => { onEdit(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-overlay transition-colors"
            >
              Bewerken
            </button>
            {isLinked && onSync && (
              <button
                onClick={() => { onSync(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-overlay transition-colors"
              >
                Synchroniseren
              </button>
            )}
            {onExport && (
              <button
                onClick={() => { onExport(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-overlay transition-colors"
              >
                Exporteer als iCal
              </button>
            )}
            <hr className="my-1 border-border" />
            <button
              onClick={() => { onDelete(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
            >
              Verwijderen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
