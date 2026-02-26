"use client";

import { Note } from "@/lib/types/notes";

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  onTogglePin: (id: string) => void;
}

function getPreviewText(content: string, maxLength = 120): string {
  // Strip markdown syntax for preview
  const plain = content
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s/gm, "")
    .replace(/^\d+\.\s/gm, "")
    .replace(/^>\s/gm, "")
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).trim() + "...";
}

function parseTags(tagsStr: string | null): string[] {
  if (!tagsStr) return [];
  try {
    return JSON.parse(tagsStr);
  } catch {
    return [];
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "zojuist";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "gisteren";
  if (days < 7) return `${days} dagen geleden`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} ${weeks === 1 ? "week" : "weken"} geleden`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "maand" : "maanden"} geleden`;
  return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function NoteCard({ note, onClick, onTogglePin }: NoteCardProps) {
  const tags = parseTags(note.tags);
  const preview = getPreviewText(note.content);
  const accentColor =
    note.color && note.color !== "#ffffff"
      ? note.color
      : note.folder?.color && note.folder.color !== "#ffffff"
        ? note.folder.color
        : null;
  const hasAccent = !!accentColor;

  return (
    <div
      onClick={() => onClick(note)}
      className="break-inside-avoid mb-3 group cursor-pointer rounded-xl border border-border hover:bg-surface-hover transition-all duration-200 hover:shadow-md overflow-hidden"
      style={hasAccent ? { backgroundColor: `${accentColor}14` } : undefined}
    >
      {/* Color accent bar */}
      {hasAccent && (
        <div className="h-1" style={{ backgroundColor: accentColor ?? undefined }} />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-semibold text-sm text-foreground line-clamp-2 leading-snug">
            {note.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id);
            }}
            className={`shrink-0 p-1 rounded transition-all ${
              note.isPinned
                ? "text-accent"
                : "text-transparent group-hover:text-muted-foreground/50 hover:!text-accent"
            }`}
            title={note.isPinned ? "Losmaken" : "Vastpinnen"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={note.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 2L12 22M12 2L8 6M12 2L16 6" strokeLinecap="round" strokeLinejoin="round" />
              {note.isPinned && <circle cx="12" cy="12" r="3" />}
            </svg>
          </button>
        </div>

        {/* Content preview */}
        {preview && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-4 leading-relaxed">
            {preview}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-surface text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: folder + date */}
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground/60">
          {note.folder && (
            <div className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {note.folder.name}
            </div>
          )}
          {note.folder && <span className="text-muted-foreground/30">&middot;</span>}
          <span>{timeAgo(note.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
