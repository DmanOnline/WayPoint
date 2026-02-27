"use client";

import { TaskRecurrenceRule } from "@/lib/types/tasks";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface RecurrenceSelectorProps {
  rule: TaskRecurrenceRule | null;
  day: number | null;
  end: string;
  onChange: (data: {
    recurrenceRule: TaskRecurrenceRule | null;
    recurrenceDay: number | null;
    recurrenceEnd: string;
  }) => void;
}

const DAY_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export default function RecurrenceSelector({
  rule,
  day,
  end,
  onChange,
}: RecurrenceSelectorProps) {
  const rules: { value: TaskRecurrenceRule | null; label: string }[] = [
    { value: null, label: "Geen herhaling" },
    { value: "DAILY", label: "Dagelijks" },
    { value: "WEEKLY", label: "Wekelijks" },
    { value: "MONTHLY", label: "Maandelijks" },
    { value: "YEARLY", label: "Jaarlijks" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground">
        Herhaling
      </label>
      <select
        value={rule || ""}
        onChange={(e) =>
          onChange({
            recurrenceRule: (e.target.value as TaskRecurrenceRule) || null,
            recurrenceDay: null,
            recurrenceEnd: end,
          })
        }
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        {rules.map((r) => (
          <option key={r.value || "none"} value={r.value || ""}>
            {r.label}
          </option>
        ))}
      </select>

      {/* Day selector for WEEKLY */}
      {rule === "WEEKLY" && (
        <div className="flex gap-1">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                onChange({ recurrenceRule: rule, recurrenceDay: i, recurrenceEnd: end })
              }
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                day === i
                  ? "bg-accent text-white"
                  : "bg-surface hover:bg-surface-hover text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Day of month for MONTHLY */}
      {rule === "MONTHLY" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Dag van de maand
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={day || ""}
            onChange={(e) =>
              onChange({
                recurrenceRule: rule,
                recurrenceDay: parseInt(e.target.value) || null,
                recurrenceEnd: end,
              })
            }
            placeholder="1-31"
            className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      )}

      {/* End date */}
      {rule && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Eindigt op (optioneel)
          </label>
          <SmartDateInput
            value={end}
            onChange={(v) =>
              onChange({
                recurrenceRule: rule,
                recurrenceDay: day,
                recurrenceEnd: v,
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      )}
    </div>
  );
}
