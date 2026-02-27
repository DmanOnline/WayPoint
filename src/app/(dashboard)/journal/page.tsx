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
  const [isDirty, setIsDirty] = useState(false);
  const [unsavedDialog, setUnsavedDialog] = useState<{ open: boolean; action: (() => void) | null }>({ open: false, action: null });

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

  const guardNav = (action: () => void) => {
    if (isDirty) {
      setUnsavedDialog({ open: true, action });
      return;
    }
    action();
  };

  const handleSelectDate = (date: Date) => {
    guardNav(() => { setSelectedDate(date); setNav("today"); });
  };

  const handleNavChange = (newNav: JournalNav) => {
    guardNav(() => setNav(newNav));
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
        onSelectNav={handleNavChange}
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
            onDirtyChange={setIsDirty}
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

      {unsavedDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-foreground mb-2">Niet-opgeslagen wijzigingen</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Je hebt wijzigingen die nog niet zijn opgeslagen. Wil je toch doorgaan? Autosave slaat ze alsnog op.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUnsavedDialog({ open: false, action: null })}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Blijf hier
              </button>
              <button
                onClick={() => {
                  const action = unsavedDialog.action;
                  setUnsavedDialog({ open: false, action: null });
                  setIsDirty(false);
                  action?.();
                }}
                className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 transition-colors"
              >
                Doorgaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
