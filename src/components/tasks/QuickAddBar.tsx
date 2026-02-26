"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parseTaskInput, formatScheduledDate, formatDueDate, formatRecurrence } from "@/lib/tasks";
import { Project, ParsedTaskInput } from "@/lib/types/tasks";

interface QuickAddBarProps {
  projects: Project[];
  onAdd: (data: {
    title: string;
    scheduledDate?: string;
    scheduledTime?: string;
    dueDate?: string;
    priority?: string;
    projectId?: string;
    recurrenceRule?: string;
    recurrenceDay?: number;
  }) => Promise<void>;
}

export default function QuickAddBar({ projects, onAdd }: QuickAddBarProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedTaskInput>({ title: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleParse = useCallback(
    (value: string) => {
      setInput(value);
      if (!value.trim()) {
        setParsed({ title: "" });
        return;
      }
      const result = parseTaskInput(value);
      // Match project name to actual project
      if (result.projectName) {
        const match = projects.find(
          (p) => p.name.toLowerCase() === result.projectName
        );
        if (match) {
          result.projectName = match.name;
        }
      }
      setParsed(result);
    },
    [projects]
  );

  const handleSubmit = useCallback(async () => {
    if (!parsed.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    try {
      // Find project ID from name
      let projectId: string | undefined;
      if (parsed.projectName) {
        const match = projects.find(
          (p) => p.name.toLowerCase() === parsed.projectName?.toLowerCase()
        );
        if (match) projectId = match.id;
      }

      await onAdd({
        title: parsed.title,
        scheduledDate: parsed.scheduledDate,
        scheduledTime: parsed.scheduledTime,
        dueDate: parsed.dueDate,
        priority: parsed.priority,
        projectId,
        recurrenceRule: parsed.recurrenceRule,
        recurrenceDay: parsed.recurrenceDay,
      });

      setInput("");
      setParsed({ title: "" });
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanmaken mislukt");
    } finally {
      setIsSubmitting(false);
    }
  }, [parsed, projects, onAdd, isSubmitting]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasTags =
    parsed.scheduledDate ||
    parsed.dueDate ||
    parsed.priority ||
    parsed.projectName ||
    parsed.recurrenceRule;

  const scheduledLabel = formatScheduledDate(
    parsed.scheduledDate || null,
    parsed.scheduledTime || null
  ).label;
  const dueInfo = formatDueDate(parsed.dueDate || null);
  const recurrenceLabel = formatRecurrence(
    parsed.recurrenceRule || null,
    parsed.recurrenceDay ?? null
  );

  const priorityLabels: Record<string, { label: string; color: string }> = {
    high: { label: "Hoog", color: "bg-red-500/20 text-red-400" },
    medium: { label: "Gemiddeld", color: "bg-amber-500/20 text-amber-400" },
    low: { label: "Laag", color: "bg-blue-500/20 text-blue-400" },
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleParse(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Taak toevoegen... bijv. 'morgen 10:00 boodschappen doen'"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm"
            disabled={isSubmitting}
          />
          {input && (
            <button
              onClick={() => {
                setInput("");
                setParsed({ title: "" });
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!parsed.title.trim() || isSubmitting}
          className="px-4 py-3 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto hover:text-red-300">✕</button>
        </div>
      )}

      {/* Preview tags */}
      {hasTags && input && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-1 animate-fade-in">
          {scheduledLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {scheduledLabel}
            </span>
          )}
          {dueInfo.label && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                dueInfo.isOverdue
                  ? "bg-red-500/20 text-red-400"
                  : "bg-orange-500/15 text-orange-400"
              }`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {dueInfo.label}
            </span>
          )}
          {parsed.priority && priorityLabels[parsed.priority] && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${priorityLabels[parsed.priority].color}`}
            >
              {priorityLabels[parsed.priority].label}
            </span>
          )}
          {parsed.projectName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-xs font-medium">
              #{parsed.projectName}
            </span>
          )}
          {recurrenceLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-medium">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {recurrenceLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
