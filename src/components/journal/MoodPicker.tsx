"use client";

import { MOODS } from "@/lib/types/journal";

interface MoodPickerProps {
  value: number | null;
  onChange: (mood: number | null) => void;
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      {MOODS.map((mood) => {
        const isSelected = value === mood.value;
        return (
          <button
            key={mood.value}
            onClick={() => onChange(isSelected ? null : mood.value)}
            title={mood.label}
            className="group relative flex flex-col items-center gap-1 transition-all duration-150"
          >
            <span
              className={`text-2xl transition-all duration-150 ${
                isSelected
                  ? "scale-125 drop-shadow-[0_0_8px_var(--tw-shadow-color)]"
                  : "opacity-40 hover:opacity-80 hover:scale-110"
              }`}
              style={isSelected ? { filter: `drop-shadow(0 0 6px ${mood.color})` } : {}}
            >
              {mood.emoji}
            </span>
            {isSelected && (
              <span
                className="absolute -bottom-5 text-[10px] font-medium whitespace-nowrap"
                style={{ color: mood.color }}
              >
                {mood.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
