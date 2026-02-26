"use client";

import { useEffect, useState } from "react";

function getYearData() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  const elapsed =
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const daysPassed = Math.floor(elapsed) + 1;
  const daysRemaining = totalDays - daysPassed;
  const percentage = (elapsed / totalDays) * 100;

  // Week number (ISO)
  const tempDate = new Date(now.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );

  return { year, totalDays, daysPassed, daysRemaining, percentage, weekNumber };
}

function CircleProgress({ percentage }: { percentage: number }) {
  const size = 110;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--overlay)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: "drop-shadow(0 0 4px var(--accent-glow))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground leading-none tabular-nums">
          {percentage.toFixed(1)}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
          procent
        </span>
      </div>
    </div>
  );
}

export default function YearProgress() {
  const [data, setData] = useState(getYearData);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setData(getYearData());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors duration-200 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {data.year} voortgang
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground font-medium tabular-nums">
          week {data.weekNumber}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          {mounted ? (
            <CircleProgress percentage={data.percentage} />
          ) : (
            <div style={{ width: 110, height: 110 }} />
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
              {data.daysPassed}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">dagen gehad</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
              {data.daysRemaining}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">dagen te gaan</p>
          </div>
          <div className="col-span-2">
            <div className="w-full h-1.5 rounded-full bg-overlay overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-1000 ease-out"
                style={{
                  width: mounted
                    ? `${Math.min(data.percentage, 100)}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Dag {data.daysPassed} van {data.totalDays}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
