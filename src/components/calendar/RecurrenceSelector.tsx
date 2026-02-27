"use client";

import { RecurrenceRule } from "@/lib/types/calendar";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface RecurrenceSelectorProps {
  rule: RecurrenceRule | null;
  endDate: string;
  onRuleChange: (rule: RecurrenceRule | null) => void;
  onEndDateChange: (date: string) => void;
}

const options: { value: RecurrenceRule | null; label: string }[] = [
  { value: null, label: "Geen" },
  { value: "DAILY", label: "Dagelijks" },
  { value: "WEEKLY", label: "Wekelijks" },
  { value: "MONTHLY", label: "Maandelijks" },
  { value: "YEARLY", label: "Jaarlijks" },
];

export default function RecurrenceSelector({
  rule,
  endDate,
  onRuleChange,
  onEndDateChange,
}: RecurrenceSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Herhaling
      </label>
      <select
        value={rule || ""}
        onChange={(e) =>
          onRuleChange((e.target.value || null) as RecurrenceRule | null)
        }
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
      >
        {options.map((opt) => (
          <option key={opt.label} value={opt.value || ""}>
            {opt.label}
          </option>
        ))}
      </select>

      {rule && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Eindigt op (optioneel)
          </label>
          <SmartDateInput
            value={endDate}
            onChange={onEndDateChange}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
          />
        </div>
      )}
    </div>
  );
}
