"use client";

import { JournalEntry, getMood, toDateStr } from "@/lib/types/journal";

interface JournalListProps {
  entries: JournalEntry[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const MONTH_NAMES = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export default function JournalList({ entries, selectedDate, onSelect }: JournalListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-3">📖</p>
        <p className="text-sm font-medium text-foreground/60">Nog geen entries</p>
        <p className="text-xs text-muted-foreground mt-1">Begin met journallen om hier entries te zien</p>
      </div>
    );
  }

  const selectedStr = toDateStr(selectedDate);

  return (
    <div className="space-y-2 animate-fade-in">
      {entries.map((entry) => {
        const d = new Date(entry.date);
        const dateStr = toDateStr(d);
        const mood = getMood(entry.mood);
        const isActive = dateStr === selectedStr;
        const today = new Date();
        const isToday = dateStr === toDateStr(today);
        const preview = entry.content.replace(/<[^>]*>/g, "").slice(0, 120);

        return (
          <button
            key={entry.id}
            onClick={() => onSelect(d)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              isActive
                ? "border-accent/40 bg-accent/5"
                : "border-border bg-surface hover:border-border/80 hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {mood && <span className="text-base">{mood.emoji}</span>}
                  <span className="text-sm font-semibold text-foreground truncate">
                    {entry.title || (isToday ? "Vandaag" : `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`)}
                  </span>
                </div>
                {preview && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{preview}</p>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {entry.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] text-accent/70">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {d.getDate()} {MONTH_NAMES[d.getMonth()].slice(0, 3)} {d.getFullYear()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
