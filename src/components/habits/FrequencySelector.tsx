"use client";

import { FrequencyType, FrequencyPeriod } from "@/lib/types/habits";
import { getWeekDayShort } from "@/lib/habits";

interface FrequencySelectorProps {
  frequencyType: FrequencyType;
  frequencyTarget: number;
  frequencyPeriod: FrequencyPeriod;
  frequencyInterval: number;
  frequencyDays: number[];
  onChange: (data: {
    frequencyType: FrequencyType;
    frequencyTarget: number;
    frequencyPeriod: FrequencyPeriod;
    frequencyInterval: number;
    frequencyDays: number[];
  }) => void;
}

export default function FrequencySelector({
  frequencyType,
  frequencyTarget,
  frequencyPeriod,
  frequencyInterval,
  frequencyDays,
  onChange,
}: FrequencySelectorProps) {
  const tabs: { key: FrequencyType; label: string }[] = [
    { key: "daily", label: "Dagelijks" },
    { key: "weekly", label: "Wekelijks" },
    { key: "custom", label: "Aangepast" },
  ];

  const toggleDay = (day: number) => {
    const newDays = frequencyDays.includes(day)
      ? frequencyDays.filter((d) => d !== day)
      : [...frequencyDays, day].sort();
    onChange({ frequencyType, frequencyTarget, frequencyPeriod, frequencyInterval, frequencyDays: newDays });
  };

  const update = (partial: Partial<{
    frequencyType: FrequencyType;
    frequencyTarget: number;
    frequencyPeriod: FrequencyPeriod;
    frequencyInterval: number;
    frequencyDays: number[];
  }>) => {
    onChange({
      frequencyType,
      frequencyTarget,
      frequencyPeriod,
      frequencyInterval,
      frequencyDays,
      ...partial,
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        Frequentie
      </label>

      {/* Type tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-hover/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              update({
                frequencyType: tab.key,
                frequencyTarget: tab.key === "daily" ? 1 : frequencyTarget,
                frequencyPeriod: tab.key === "daily" ? "day" : tab.key === "weekly" ? "week" : frequencyPeriod,
                frequencyInterval: 1,
                frequencyDays: tab.key === "weekly" ? frequencyDays : [],
              })
            }
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              frequencyType === tab.key
                ? "bg-accent text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Daily: interval */}
      {frequencyType === "daily" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Elke</span>
          <input
            type="number"
            min={1}
            max={365}
            value={frequencyInterval}
            onChange={(e) => update({ frequencyInterval: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <span className="text-sm text-muted-foreground">{frequencyInterval === 1 ? "dag" : "dagen"}</span>
        </div>
      )}

      {/* Weekly: day selector + interval */}
      {frequencyType === "weekly" && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Elke</span>
            <input
              type="number"
              min={1}
              max={52}
              value={frequencyInterval}
              onChange={(e) => update({ frequencyInterval: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <span className="text-sm text-muted-foreground">{frequencyInterval === 1 ? "week" : "weken"}</span>
          </div>
          <div className="flex gap-1.5 justify-center">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                  frequencyDays.includes(day)
                    ? "bg-accent text-white"
                    : "bg-surface-hover text-muted-foreground hover:text-foreground hover:bg-surface-hover/80"
                }`}
              >
                {getWeekDayShort(day)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Custom: X times per Y interval period */}
      {frequencyType === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            min={1}
            max={99}
            value={frequencyTarget}
            onChange={(e) => update({ frequencyTarget: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <span className="text-sm text-muted-foreground">keer per</span>
          <input
            type="number"
            min={1}
            max={365}
            value={frequencyInterval}
            onChange={(e) => update({ frequencyInterval: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <select
            value={frequencyPeriod}
            onChange={(e) => update({ frequencyPeriod: e.target.value as FrequencyPeriod })}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="day">{frequencyInterval === 1 ? "dag" : "dagen"}</option>
            <option value="week">{frequencyInterval === 1 ? "week" : "weken"}</option>
            <option value="month">{frequencyInterval === 1 ? "maand" : "maanden"}</option>
          </select>
        </div>
      )}
    </div>
  );
}
