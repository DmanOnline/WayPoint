"use client";

import { useState, useEffect } from "react";
import { GoalCategory, GoalFormData, GoalModalState, GoalPriority } from "@/lib/types/goals";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface GoalModalProps {
  modalState: GoalModalState;
  categories: GoalCategory[];
  onClose: () => void;
  onSave: (data: GoalFormData) => Promise<void>;
}

const COLORS = [
  "#6C63FF", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

export default function GoalModal({
  modalState,
  categories,
  onClose,
  onSave,
}: GoalModalProps) {
  const { open, mode, goal } = modalState;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [color, setColor] = useState("#6C63FF");
  const [categoryId, setCategoryId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && mode === "edit" && goal) {
      setTitle(goal.title);
      setDescription(goal.description || "");
      setPriority(goal.priority);
      setColor(goal.color);
      setCategoryId(goal.categoryId || "");
      setTargetDate(goal.targetDate ? goal.targetDate.split("T")[0] : "");
    } else if (open) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setColor("#6C63FF");
      setCategoryId("");
      setTargetDate("");
    }
    setIsSubmitting(false);
    setError("");
  }, [open, mode, goal]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        color,
        categoryId,
        targetDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-backdrop"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md pointer-events-auto animate-scale-in max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              {mode === "edit" ? "Doel bewerken" : "Nieuw doel"}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {error && (
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bijv. Marathon lopen"
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Wat wil je bereiken?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>

            {/* Priority + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Prioriteit
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as GoalPriority)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="low">Laag</option>
                  <option value="medium">Gemiddeld</option>
                  <option value="high">Hoog</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Categorie
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="">Geen categorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target date */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Streefdatum (optioneel)
              </label>
              <SmartDateInput
                value={targetDate}
                onChange={setTargetDate}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kleur
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-card ring-accent scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? "Opslaan..." : mode === "edit" ? "Opslaan" : "Aanmaken"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-surface-hover transition-all"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
