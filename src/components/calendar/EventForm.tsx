"use client";

import { EventFormData, SubCalendar, RecurrenceRule } from "@/lib/types/calendar";
import RecurrenceSelector from "./RecurrenceSelector";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface EventFormProps {
  formData: EventFormData;
  subCalendars: SubCalendar[];
  onChange: (data: Partial<EventFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
}

export default function EventForm({
  formData,
  subCalendars,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  isEditing,
  isSubmitting,
}: EventFormProps) {
  const ownCalendars = subCalendars.filter((c) => !c.icalUrl);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Titel <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Evenement titel"
          required
          autoFocus
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
        />
      </div>

      {/* Calendar select */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Kalender
        </label>
        <select
          value={formData.subCalendarId}
          onChange={(e) => onChange({ subCalendarId: e.target.value })}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
        >
          {ownCalendars.map((cal) => (
            <option key={cal.id} value={cal.id}>
              {cal.name}
            </option>
          ))}
          {/* Also show linked calendars if editing an existing linked event */}
          {subCalendars
            .filter((c) => c.icalUrl && c.id === formData.subCalendarId)
            .map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name} (gelinkt)
              </option>
            ))}
        </select>
      </div>

      {/* All day toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ isAllDay: !formData.isAllDay })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            formData.isAllDay ? "bg-accent" : "bg-border"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              formData.isAllDay ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-foreground">Hele dag</span>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Startdatum
          </label>
          <SmartDateInput
            value={formData.startDate}
            onChange={(v) => onChange({ startDate: v })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
          />
        </div>
        {!formData.isAllDay && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Starttijd
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Einddatum
          </label>
          <SmartDateInput
            value={formData.endDate}
            onChange={(v) => onChange({ endDate: v })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
          />
        </div>
        {!formData.isAllDay && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Eindtijd
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Locatie
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Voeg locatie toe"
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2.5 text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Beschrijving
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Voeg beschrijving toe"
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all resize-none"
        />
      </div>

      {/* Recurrence */}
      <RecurrenceSelector
        rule={formData.recurrenceRule}
        endDate={formData.recurrenceEnd}
        onRuleChange={(rule) => onChange({ recurrenceRule: rule })}
        onEndDateChange={(date) => onChange({ recurrenceEnd: date })}
      />

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-sm text-red-500 hover:text-red-400 transition-colors"
            >
              Verwijderen
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-overlay transition-all"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-accent hover:bg-accent-hover active:scale-[0.98] shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            {isSubmitting ? "Opslaan..." : isEditing ? "Bijwerken" : "Aanmaken"}
          </button>
        </div>
      </div>
    </form>
  );
}
