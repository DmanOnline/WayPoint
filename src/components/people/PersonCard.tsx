"use client";

import { Person, getPersonType, getInitials, daysSince, getRelationshipHealth, HEALTH_CONFIG, daysUntilBirthday } from "@/lib/types/people";

interface PersonCardProps {
  person: Person;
  isSelected: boolean;
  onClick: () => void;
}

export default function PersonCard({ person, isSelected, onClick }: PersonCardProps) {
  const type = getPersonType(person.type);
  const initials = getInitials(person.name);
  const since = daysSince(person.lastContactedAt);
  const birthdayIn = daysUntilBirthday(person.birthday);
  const isBirthdayToday = birthdayIn === 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
        isBirthdayToday
          ? "border-pink-500/40 bg-gradient-to-r from-pink-500/10 to-orange-500/10"
          : isSelected
          ? "border-accent/40 bg-accent/5"
          : "border-border bg-surface hover:border-border/60 hover:bg-surface-hover"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${isBirthdayToday ? "ring-2 ring-pink-500/50 ring-offset-1 ring-offset-transparent" : ""}`}
        style={{ backgroundColor: person.avatarColor }}
      >
        {isBirthdayToday ? "🎂" : initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{person.name}</span>
          {person.isPinned && (
            <svg className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {type && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${type.color}20`, color: type.color }}>
              {type.label}
            </span>
          )}
          {person.company && (
            <span className="text-[10px] text-muted-foreground truncate">{person.company}</span>
          )}
        </div>
      </div>

      {/* Birthday indicator */}
      {birthdayIn !== null && birthdayIn <= 7 && birthdayIn > 0 && (
        <span className="text-[10px] text-pink-400 flex-shrink-0 font-medium">🎂 {birthdayIn}d</span>
      )}

      {/* Last contact + health */}
      {since !== null && (() => {
        const health = getRelationshipHealth(person.lastContactedAt, person.contactFrequency);
        const healthCfg = health ? HEALTH_CONFIG[health] : null;
        return (
          <span className="text-[10px] flex-shrink-0 flex items-center gap-1">
            {healthCfg && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${healthCfg.dot}`} />}
            <span style={healthCfg ? { color: healthCfg.color } : undefined} className={!healthCfg ? (since > 30 ? "text-orange-400" : "text-muted-foreground") : ""}>
              {since === 0 ? "vandaag" : since === 1 ? "gisteren" : `${since}d`}
            </span>
          </span>
        );
      })()}
    </button>
  );
}
