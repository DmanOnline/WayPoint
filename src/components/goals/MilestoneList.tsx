"use client";

import { useState, useRef } from "react";
import { GoalMilestone } from "@/lib/types/goals";

interface MilestoneListProps {
  milestones: GoalMilestone[];
  goalColor: string;
  onToggle: (milestoneId: string) => Promise<void>;
  onAdd: (title: string) => Promise<void>;
  onDelete: (milestoneId: string) => Promise<void>;
  onUpdate: (milestoneId: string, title: string) => Promise<void>;
}

export default function MilestoneList({
  milestones,
  goalColor,
  onToggle,
  onAdd,
  onDelete,
  onUpdate,
}: MilestoneListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggle = async (milestone: GoalMilestone) => {
    if (!milestone.isCompleted) {
      // Celebrating: show animation before toggling
      setCelebratingId(milestone.id);
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebratingId(null), 700);
    }
    await onToggle(milestone.id);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(newTitle.trim());
      setNewTitle("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEditing = (milestone: GoalMilestone) => {
    setEditingId(milestone.id);
    setEditTitle(milestone.title);
  };

  const handleSaveEdit = async (milestoneId: string) => {
    if (!editTitle.trim()) return;
    await onUpdate(milestoneId, editTitle.trim());
    setEditingId(null);
    setEditTitle("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, milestoneId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(milestoneId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-1">
      {milestones.map((milestone) => {
        const isCelebrating = celebratingId === milestone.id;
        return (
          <div
            key={milestone.id}
            className={`group flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-surface-hover transition-colors ${
              isCelebrating ? "milestone-celebrate" : ""
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggle(milestone)}
              className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isCelebrating ? "animate-checkbox-pop animate-success-ring" : ""
              }`}
              style={{
                borderColor: milestone.isCompleted || isCelebrating ? goalColor : "var(--border)",
                backgroundColor: milestone.isCompleted || isCelebrating ? goalColor : "transparent",
              }}
            >
              {(milestone.isCompleted || isCelebrating) && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  className={isCelebrating ? "animate-checkmark-draw" : ""}
                >
                  <polyline
                    points="20 6 9 17 4 12"
                    strokeDasharray={isCelebrating ? 24 : undefined}
                    strokeDashoffset={0}
                  />
                </svg>
              )}
            </button>

            {/* Title */}
            {editingId === milestone.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, milestone.id)}
                onBlur={() => handleSaveEdit(milestone.id)}
                className="flex-1 px-2 py-0.5 text-sm bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                autoFocus
              />
            ) : (
              <span
                onClick={() => startEditing(milestone)}
                className={`flex-1 text-sm cursor-text transition-all duration-300 ${
                  milestone.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {milestone.title}
              </span>
            )}

            {/* Delete */}
            <button
              onClick={() => onDelete(milestone.id)}
              className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}

      {/* Add milestone input */}
      <div className="flex items-center gap-2 pt-1">
        <div className="shrink-0 w-5 h-5 rounded border-2 border-dashed border-border/50 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/50">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nieuwe mijlpaal..."
          className="flex-1 px-2 py-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {newTitle.trim() && (
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            Toevoegen
          </button>
        )}
      </div>
    </div>
  );
}
