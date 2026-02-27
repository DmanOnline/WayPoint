"use client";

import { useState, useEffect } from "react";
import { HabitModalState, HabitFormData, HabitCategory, FrequencyType, FrequencyPeriod } from "@/lib/types/habits";
import { toDateString } from "@/lib/habits";
import FrequencySelector from "./FrequencySelector";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface HabitModalProps {
  modalState: HabitModalState;
  categories: HabitCategory[];
  onClose: () => void;
  onSave: (data: HabitFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
}

const COLORS = [
  "#6C63FF", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

export default function HabitModal({
  modalState,
  categories,
  onClose,
  onSave,
  onDelete,
  onArchive,
}: HabitModalProps) {
  const { open, mode, habit } = modalState;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6C63FF");
  const [icon, setIcon] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequencyType, setFrequencyType] = useState<FrequencyType>("daily");
  const [frequencyTarget, setFrequencyTarget] = useState(1);
  const [frequencyPeriod, setFrequencyPeriod] = useState<FrequencyPeriod>("day");
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(toDateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && mode === "edit" && habit) {
      setName(habit.name);
      setDescription(habit.description || "");
      setColor(habit.color);
      setIcon(habit.icon || "");
      setCategoryId(habit.categoryId || "");
      setFrequencyType(habit.frequencyType);
      setFrequencyTarget(habit.frequencyTarget);
      setFrequencyPeriod(habit.frequencyPeriod);
      setFrequencyInterval(habit.frequencyInterval || 1);
      setFrequencyDays(habit.frequencyDays ? JSON.parse(habit.frequencyDays) : []);
      setStartDate(habit.startDate ? toDateString(new Date(habit.startDate)) : toDateString(new Date(habit.createdAt)));
    } else if (open) {
      setName("");
      setDescription("");
      setColor("#6C63FF");
      setIcon("");
      setCategoryId("");
      setFrequencyType("daily");
      setFrequencyTarget(1);
      setFrequencyPeriod("day");
      setFrequencyInterval(1);
      setFrequencyDays([]);
      setStartDate(toDateString(new Date()));
    }
    setIsSubmitting(false);
    setError("");
  }, [open, mode, habit]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        description,
        color,
        icon: icon.trim(),
        categoryId,
        frequencyType,
        frequencyTarget,
        frequencyPeriod,
        frequencyInterval,
        frequencyDays,
        startDate,
        reminderTime: "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(habit.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!habit || !onArchive) return;
    setIsSubmitting(true);
    try {
      await onArchive(habit.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archiveren mislukt");
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
            <h2 className="text-base font-semibold text-foreground">
              {mode === "edit" ? "Habit bewerken" : "Nieuwe habit"}
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

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Naam
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Mediteren"
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
                placeholder="Extra details..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>

            {/* Icon + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Icoon
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="bijv. 🧘"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  maxLength={4}
                />
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
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
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
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-card ring-accent scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Frequency */}
            <FrequencySelector
              frequencyType={frequencyType}
              frequencyTarget={frequencyTarget}
              frequencyPeriod={frequencyPeriod}
              frequencyInterval={frequencyInterval}
              frequencyDays={frequencyDays}
              onChange={(data) => {
                setFrequencyType(data.frequencyType);
                setFrequencyTarget(data.frequencyTarget);
                setFrequencyPeriod(data.frequencyPeriod);
                setFrequencyInterval(data.frequencyInterval);
                setFrequencyDays(data.frequencyDays);
              }}
            />

            {/* Start date */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Startdatum
              </label>
              <SmartDateInput
                value={startDate}
                onChange={setStartDate}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
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

            {mode === "edit" && (
              <div className="flex items-center gap-2 border-t border-border pt-3">
                {onArchive && (
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-muted-foreground text-sm hover:bg-surface-hover transition-all"
                  >
                    {habit?.isArchived ? "Dearchiveren" : "Archiveren"}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition-all ml-auto"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
