"use client";

import Link from "next/link";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  isActive: boolean;
  index: number;
}

export default function ModuleCard({
  title,
  description,
  icon,
  href,
  color,
  isActive,
  index,
}: ModuleCardProps) {
  return (
    <Link
      href={isActive ? href : "#"}
      className={`group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 animate-fade-in opacity-0 stagger-${index + 1} ${
        isActive
          ? "hover:shadow-md hover:-translate-y-[2px] cursor-pointer"
          : "opacity-50 pointer-events-none"
      }`}
      style={{ ["--ease-spring" as string]: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}14` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>

      {/* Content */}
      <h3 className="text-sm font-semibold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Status + Arrow */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
            isActive ? "text-positive" : "text-muted-foreground"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-positive" : "bg-muted"
            }`}
          />
          {isActive ? "Actief" : "Binnenkort"}
        </span>
        <svg
          className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-150"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  );
}
