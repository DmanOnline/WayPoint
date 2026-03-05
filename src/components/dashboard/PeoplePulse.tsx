"use client";

import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  people: DashboardData["people"] | null;
  loading: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function PeoplePulse({ people, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-4 card-gradient">
        <div className="h-4 w-20 bg-border rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-border animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 bg-border rounded animate-pulse" />
                <div className="h-2.5 w-16 bg-border rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const needs = people?.needsAttention ?? [];
  const bdays = people?.upcomingBirthdays ?? [];
  const followUps = people?.overdueFollowUps ?? 0;
  const isEmpty = needs.length === 0 && bdays.length === 0 && followUps === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-4 card-gradient">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Mensen
          </h3>
          {followUps > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-negative/10 text-negative font-medium">
              {followUps} follow-up{followUps !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Link href="/people" className="text-xs text-accent hover:underline">
          Alles
        </Link>
      </div>

      {isEmpty ? (
        <div className="flex items-center gap-2 py-2">
          <span className="text-positive text-sm">&#10003;</span>
          <span className="text-sm text-muted-foreground">Alles op schema</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Needs attention */}
          {needs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aandacht nodig</p>
              {needs.slice(0, 3).map((person) => (
                <Link
                  key={person.id}
                  href={`/people`}
                  className="flex items-center gap-3 py-1 group"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                    style={{ backgroundColor: person.avatarColor }}
                  >
                    {getInitials(person.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:text-accent transition-colors">
                      {person.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {person.daysSinceContact !== null
                        ? `${person.daysSinceContact} dagen geleden`
                        : "Nooit gecontact"}
                    </p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      person.health === "neglected" ? "bg-red-500" : "bg-orange-500"
                    }`}
                  />
                </Link>
              ))}
            </div>
          )}

          {/* Birthdays */}
          {bdays.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Verjaardagen</p>
              {bdays.map((person) => (
                <div key={person.id} className="flex items-center gap-3 py-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                    style={{ backgroundColor: person.avatarColor }}
                  >
                    {getInitials(person.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{person.name}</p>
                    <p className="text-[10px] text-muted-foreground">{person.date}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {person.daysUntil === 0 ? "Vandaag!" : `over ${person.daysUntil}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
