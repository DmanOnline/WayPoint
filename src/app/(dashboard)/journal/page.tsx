"use client";

import { useState, useEffect, useCallback } from "react";
import { JournalEntry, toDateStr } from "@/lib/types/journal";
import JournalSidebar, { JournalNav } from "@/components/journal/JournalSidebar";
import JournalEditor from "@/components/journal/JournalEditor";
import JournalList from "@/components/journal/JournalList";
import JournalStats from "@/components/journal/JournalStats";

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [nav, setNav] = useState<JournalNav>("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/journal");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } catch (err) {
      console.error("Journal entries ophalen mislukt:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchEntries();
      setLoading(false);
    }
    init();
  }, [fetchEntries]);

  const selectedDateStr = toDateStr(selectedDate);
  const activeEntry = entries.find((e) => {
    const d = new Date(e.date);
    return toDateStr(d) === selectedDateStr;
  }) ?? null;

  const handleSaved = (saved: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.find((e) => e.id === saved.id);
      if (exists) return prev.map((e) => (e.id === saved.id ? saved : e));
      return [saved, ...prev];
    });
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Verwijderen mislukt");
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setNav("today");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Journal laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <JournalSidebar
        entries={entries}
        activeNav={nav}
        selectedDate={selectedDate}
        onSelectNav={setNav}
        onSelectDate={handleSelectDate}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-0 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {nav === "today" && (
          <JournalEditor
            date={selectedDate}
            entry={activeEntry}
            allEntries={entries}
            onSaved={handleSaved}
            onDelete={handleDelete}
          />
        )}

        {nav === "all" && (
          <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8">
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-6">Alle entries</h1>
            <JournalList
              entries={entries}
              selectedDate={selectedDate}
              onSelect={(date) => { setSelectedDate(date); setNav("today"); }}
            />
          </div>
        )}

        {nav === "stats" && (
          <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8">
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-6">Statistieken</h1>
            <JournalStats entries={entries} />
          </div>
        )}
      </div>
    </div>
  );
}
