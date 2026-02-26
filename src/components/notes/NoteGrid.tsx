"use client";

import { Note } from "@/lib/types/notes";
import NoteCard from "./NoteCard";

interface NoteGridProps {
  notes: Note[];
  onClickNote: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onNewNote: () => void;
}

export default function NoteGrid({ notes, onClickNote, onTogglePin, onNewNote }: NoteGridProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Geen notities gevonden</p>
        <button
          onClick={onNewNote}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all"
        >
          Nieuwe notitie
        </button>
      </div>
    );
  }

  // Split pinned and unpinned
  const pinned = notes.filter((n) => n.isPinned);
  const unpinned = notes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6 pt-4">
      {/* Pinned section */}
      {pinned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Vastgepind
          </p>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
            {pinned.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={onClickNote}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unpinned / rest */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Overige
            </p>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
            {unpinned.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={onClickNote}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
