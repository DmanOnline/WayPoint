"use client";

import { useState, useEffect } from "react";
import {
  CalendarEvent,
  SubCalendar,
  EventFormData,
  ModalState,
} from "@/lib/types/calendar";
import { toDateString, toTimeString } from "@/lib/calendar";
import EventForm from "./EventForm";

interface EventModalProps {
  modalState: ModalState;
  subCalendars: SubCalendar[];
  onClose: () => void;
  onSave: (data: EventFormData, editMode?: "this" | "all") => Promise<void>;
  onDelete: (
    event: CalendarEvent,
    deleteMode: "this" | "all" | "future"
  ) => Promise<void>;
}

export default function EventModal({
  modalState,
  subCalendars,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecurringChoice, setShowRecurringChoice] = useState(false);
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isEditing = modalState.mode === "edit";
  const event = modalState.event;
  const isRecurring = event?.recurrenceRule || event?._isVirtual;
  const eventCal = subCalendars.find((c) => c.id === event?.subCalendarId);
  const isIcalEvent = !!eventCal?.icalUrl;

  // Find a default subCalendar (first own calendar)
  const defaultCalId =
    subCalendars.find((c) => !c.icalUrl)?.id || subCalendars[0]?.id || "";

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    location: "",
    subCalendarId: defaultCalId,
    startDate: modalState.defaultDate || toDateString(new Date()),
    startTime: modalState.defaultTime || "09:00",
    endDate: modalState.defaultDate || toDateString(new Date()),
    endTime: modalState.defaultTime
      ? `${String(parseInt(modalState.defaultTime.split(":")[0]) + 1).padStart(2, "0")}:00`
      : "10:00",
    isAllDay: !modalState.defaultTime && modalState.mode === "create",
    recurrenceRule: null,
    recurrenceEnd: "",
  });

  // Reset choice dialogs and form when modal state changes
  useEffect(() => {
    setShowRecurringChoice(false);
    setShowDeleteChoice(false);
    setIsSubmitting(false);
    setDeleteError("");

    if (!isEditing) {
      setFormData({
        title: "",
        description: "",
        location: "",
        subCalendarId: defaultCalId,
        startDate: modalState.defaultDate || toDateString(new Date()),
        startTime: modalState.defaultTime || "09:00",
        endDate: modalState.defaultDate || toDateString(new Date()),
        endTime: modalState.defaultTime
          ? `${String(parseInt(modalState.defaultTime.split(":")[0]) + 1).padStart(2, "0")}:00`
          : "10:00",
        isAllDay: !modalState.defaultTime && modalState.mode === "create",
        recurrenceRule: null,
        recurrenceEnd: "",
      });
    }
  }, [modalState]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && event) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      setFormData({
        title: event.title,
        description: event.description || "",
        location: event.location || "",
        subCalendarId: event.subCalendarId,
        startDate: toDateString(start),
        startTime: toTimeString(start),
        endDate: toDateString(end),
        endTime: toTimeString(end),
        isAllDay: event.isAllDay,
        recurrenceRule: event.recurrenceRule as EventFormData["recurrenceRule"],
        recurrenceEnd: event.recurrenceEnd
          ? toDateString(new Date(event.recurrenceEnd))
          : "",
      });
    }
  }, [isEditing, event]);

  const handleChange = (partial: Partial<EventFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && isRecurring) {
      setShowRecurringChoice(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurringSubmit = async (editMode: "this" | "all") => {
    setIsSubmitting(true);
    setShowRecurringChoice(false);
    try {
      await onSave(formData, editMode);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleteError("");

    // iCal events: delete immediately, no choice dialog
    if (isIcalEvent) {
      setIsSubmitting(true);
      try {
        const deleteMode = event._isVirtual ? "this" : "all";
        await onDelete(event, deleteMode);
        onClose();
      } catch {
        setDeleteError("Verwijderen mislukt. Probeer opnieuw.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Local recurring events: show choice dialog
    if (isRecurring) {
      setShowDeleteChoice(true);
    } else {
      setIsSubmitting(true);
      try {
        await onDelete(event, "all");
        onClose();
      } catch {
        setDeleteError("Verwijderen mislukt. Probeer opnieuw.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteChoice = async (
    deleteMode: "this" | "all" | "future"
  ) => {
    if (event) {
      await onDelete(event, deleteMode);
      onClose();
    }
  };

  if (!modalState.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-backdrop"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl shadow-shadow animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {isEditing ? "Evenement Bewerken" : "Nieuw Evenement"}
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

        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {deleteError && (
            <div className="mb-3 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              {deleteError}
            </div>
          )}
          {showRecurringChoice ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Wil je alleen dit evenement of alle evenementen in de reeks bewerken?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRecurringSubmit("this")}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-overlay text-foreground transition-all disabled:opacity-50"
                >
                  Dit evenement
                </button>
                <button
                  onClick={() => handleRecurringSubmit("all")}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg bg-accent hover:bg-accent-hover active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
                >
                  Alle evenementen
                </button>
              </div>
              <button
                onClick={() => setShowRecurringChoice(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terug
              </button>
            </div>
          ) : showDeleteChoice ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Welke evenementen wil je verwijderen?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDeleteChoice("this")}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-overlay text-foreground transition-all text-left"
                >
                  Alleen dit evenement
                </button>
                <button
                  onClick={() => handleDeleteChoice("future")}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-overlay text-foreground transition-all text-left"
                >
                  Dit en toekomstige evenementen
                </button>
                <button
                  onClick={() => handleDeleteChoice("all")}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-500 transition-all text-left"
                >
                  Alle evenementen in de reeks
                </button>
              </div>
              <button
                onClick={() => setShowDeleteChoice(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terug
              </button>
            </div>
          ) : (
            <EventForm
              formData={formData}
              subCalendars={subCalendars}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onDelete={isEditing ? handleDelete : undefined}
              isEditing={isEditing}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
