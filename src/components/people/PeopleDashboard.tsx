"use client";

import {
  Person,
  getRelationshipHealth, HEALTH_CONFIG, RelationshipHealth,
  getInitials, getContactFrequency, daysSince,
  isBirthdayWithin, daysUntilBirthday, fmtBirthday,
  getDueDateStatus,
} from "@/lib/types/people";

interface PeopleDashboardProps {
  people: Person[];
  onSelectPerson: (id: string) => void;
}

export default function PeopleDashboard({ people, onSelectPerson }: PeopleDashboardProps) {
  // People needing attention (have contactFrequency set and are warning/neglected)
  const needsAttention = people
    .filter((p) => {
      const health = getRelationshipHealth(p.lastContactedAt, p.contactFrequency);
      return health === "warning" || health === "neglected";
    })
    .sort((a, b) => {
      const aDays = daysSince(a.lastContactedAt) ?? 9999;
      const bDays = daysSince(b.lastContactedAt) ?? 9999;
      return bDays - aDays;
    });

  // Upcoming birthdays (30 days)
  const upcomingBirthdays = people
    .filter((p) => isBirthdayWithin(p.birthday, 30))
    .sort((a, b) => (daysUntilBirthday(a.birthday) ?? 999) - (daysUntilBirthday(b.birthday) ?? 999));

  // Overdue follow-ups across all people
  const overdueFollowUps = people.flatMap((p) =>
    (p.followUps ?? [])
      .filter((f) => !f.isDone && f.dueDate)
      .map((f) => ({ ...f, personName: p.name, personId: p.id, personColor: p.avatarColor }))
  ).filter((f) => {
    const status = getDueDateStatus(f.dueDate);
    return status && (status.color === "text-red-400" || status.color === "text-orange-400");
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Stats
  const totalPeople = people.length;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const interactionsThisMonth = people.reduce((sum, p) =>
    sum + (p.interactions?.filter((i) => i.date.startsWith(thisMonth)).length ?? 0), 0
  );
  const newPeopleThisMonth = people.filter((p) => p.createdAt.startsWith(thisMonth)).length;

  // Health distribution
  const healthCounts: Record<string, number> = { good: 0, okay: 0, warning: 0, neglected: 0 };
  const withFrequency = people.filter((p) => p.contactFrequency);
  withFrequency.forEach((p) => {
    const h = getRelationshipHealth(p.lastContactedAt, p.contactFrequency);
    if (h) healthCounts[h]++;
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-8">
      <h2 className="text-xl font-bold text-foreground">Sociale gezondheid</h2>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Mensen" value={totalPeople} />
        <StatCard label="Interacties deze maand" value={interactionsThisMonth} />
        <StatCard label="Nieuw deze maand" value={newPeopleThisMonth} />
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contactgezondheid</p>
          {withFrequency.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 italic">Stel contactfrequenties in</p>
          ) : (
            <div className="flex gap-1 items-end h-5">
              {(["good", "okay", "warning", "neglected"] as RelationshipHealth[]).map((h) => {
                const count = healthCounts[h];
                const pct = Math.max(2, (count / withFrequency.length) * 100);
                return (
                  <div key={h} className="flex-1 rounded-full" title={`${HEALTH_CONFIG[h].label}: ${count}`}
                    style={{ backgroundColor: HEALTH_CONFIG[h].color, height: `${pct}%`, minHeight: count > 0 ? "4px" : "2px" }} />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Aandacht nodig</p>
          <div className="space-y-1.5">
            {needsAttention.map((p) => {
              const health = getRelationshipHealth(p.lastContactedAt, p.contactFrequency)!;
              const cfg = HEALTH_CONFIG[health];
              const since = daysSince(p.lastContactedAt);
              const freq = getContactFrequency(p.contactFrequency);
              return (
                <button key={p.id} onClick={() => onSelectPerson(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-all text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: p.avatarColor }}>
                    {getInitials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className="text-[10px] text-muted-foreground">
                        {since !== null ? `${since}d geen contact` : "Nooit gecontact"}
                        {freq && ` · wil: ${freq.label.toLowerCase()}`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Verjaardagen</p>
          <div className="space-y-1.5">
            {upcomingBirthdays.map((p) => {
              const days = daysUntilBirthday(p.birthday);
              return (
                <button key={p.id} onClick={() => onSelectPerson(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-all text-left">
                  <span className="text-lg">🎂</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{fmtBirthday(p.birthday)}</span>
                  </div>
                  <span className={`text-xs ${days === 0 ? "text-accent font-medium" : "text-muted-foreground"}`}>
                    {days === 0 ? "Vandaag! 🎉" : `over ${days}d`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Overdue follow-ups */}
      {overdueFollowUps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Openstaande follow-ups</p>
          <div className="space-y-1.5">
            {overdueFollowUps.map((f) => {
              const due = getDueDateStatus(f.dueDate);
              return (
                <button key={f.id} onClick={() => onSelectPerson(f.personId)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-all text-left">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: f.personColor }}>
                    {getInitials(f.personName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground truncate">{f.text}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{f.personName}</span>
                  </div>
                  {due && <span className={`text-[10px] flex-shrink-0 ${due.color}`}>{due.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {needsAttention.length === 0 && upcomingBirthdays.length === 0 && overdueFollowUps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-3xl mb-3">✨</p>
          <p className="text-sm font-medium text-foreground/60">Alles op orde!</p>
          <p className="text-xs text-muted-foreground mt-1">Stel contactfrequenties en verjaardagen in voor meer inzichten.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
