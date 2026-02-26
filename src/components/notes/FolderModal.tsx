"use client";

import { useState, useEffect } from "react";
import { FolderModalState } from "@/lib/types/notes";

interface FolderModalProps {
  modalState: FolderModalState;
  onClose: () => void;
  onSave: (data: { name: string; color: string; icon: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

export default function FolderModal({
  modalState,
  onClose,
  onSave,
  onDelete,
}: FolderModalProps) {
  const { open, mode, folder } = modalState;
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && mode === "edit" && folder) {
      setName(folder.name);
      setColor(folder.color);
      setIcon(folder.icon || "");
    } else if (open) {
      setName("");
      setColor("#6366f1");
      setIcon("");
    }
    setIsSubmitting(false);
    setError("");
  }, [open, mode, folder]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await onSave({ name: name.trim(), color, icon: icon.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!folder || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(folder.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt");
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
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              {mode === "edit" ? "Map bewerken" : "Nieuwe map"}
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

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Naam
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Werk"
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Icoon (optioneel)
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="bijv. 📁 of 💼"
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                maxLength={4}
              />
            </div>

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
              {mode === "edit" && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition-all"
                >
                  Verwijderen
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
