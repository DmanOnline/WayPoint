"use client";

import { useState, useEffect } from "react";
import { SubCalendar, SubCalendarModalState } from "@/lib/types/calendar";
import { EVENT_COLORS } from "@/lib/calendar";

interface SubCalendarModalProps {
  modalState: SubCalendarModalState;
  onClose: () => void;
  onSave: (data: { name: string; color: string; icalUrl?: string }) => Promise<void>;
}

export default function SubCalendarModal({
  modalState,
  onClose,
  onSave,
}: SubCalendarModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [icalUrl, setIcalUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLink = modalState.mode === "link";
  const isEditing = modalState.mode === "edit";

  useEffect(() => {
    if (isEditing && modalState.subCalendar) {
      setName(modalState.subCalendar.name);
      setColor(modalState.subCalendar.color);
      setIcalUrl(modalState.subCalendar.icalUrl || "");
    } else if (isLink) {
      setName("");
      setColor(EVENT_COLORS[0].value);
      setIcalUrl("");
    } else {
      setName("");
      setColor(EVENT_COLORS[0].value);
      setIcalUrl("");
    }
    setError("");
  }, [modalState, isEditing, isLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Naam is verplicht");
      return;
    }
    if (isLink && !icalUrl.trim()) {
      setError("iCal URL is verplicht");
      return;
    }
    if (icalUrl.trim() && !/^(https?:\/\/|webcal:\/\/)/.test(icalUrl.trim())) {
      setError("URL moet beginnen met https:// of webcal://");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        color,
        icalUrl: (isLink || icalUrl) ? icalUrl.trim() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!modalState.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-backdrop"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl shadow-shadow animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {isLink
              ? "iCal URL Koppelen"
              : isEditing
              ? "Kalender Bewerken"
              : "Nieuwe Kalender"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-overlay text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* iCal URL (for link mode) */}
          {(isLink || (isEditing && modalState.subCalendar?.icalUrl)) && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                iCal URL <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https:// of webcal://..."
                required={isLink}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Plak hier de iCal feed URL (https:// of webcal://)
              </p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Naam <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Rooster, Sport, Familie"
              required
              autoFocus={!isLink}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Kleur
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-accent ring-offset-card scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-overlay transition-all"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-accent hover:bg-accent-hover active:scale-[0.98] shadow-sm transition-all duration-150 disabled:opacity-50"
            >
              {isSubmitting
                ? "Opslaan..."
                : isLink
                ? "Koppelen & Synchroniseren"
                : isEditing
                ? "Bijwerken"
                : "Aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
