"use client";

import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  notes: DashboardData["notes"] | null;
  loading: boolean;
}

export default function NotesRecap({ notes, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-6 card-gradient">
        <div className="h-4 w-20 bg-border rounded animate-pulse mb-3" />
        <div className="h-3 w-48 bg-border rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-6 card-gradient">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Notes
        </h3>
        <Link href="/notes" className="text-xs text-accent hover:underline">
          Alles
        </Link>
      </div>

      {!notes || notes.totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen notities
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            <span className="text-sm text-foreground tabular-nums">{notes.totalCount}</span>
            <span className="text-xs text-muted-foreground">notities</span>
          </div>
          {notes.recentCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {notes.recentCount} recent
            </span>
          )}
          {notes.pinnedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {notes.pinnedCount} vastgepind
            </span>
          )}
        </div>
      )}
    </div>
  );
}
