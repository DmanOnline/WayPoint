"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function formatDate(): string {
  return new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(): string {
  return new Date().toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface User {
  id: string;
  username: string;
  name: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [greeting, setGreeting] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Clock
  useEffect(() => {
    setGreeting(getGreeting());
    setDate(formatDate());
    setTime(formatTime());

    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setDate(formatDate());
      setTime(formatTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const displayName = user?.name || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="relative z-40 h-16 flex items-center justify-between px-4 md:px-8 border-b border-border bg-header-bg backdrop-blur-sm transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div>
          <h1 className="text-sm md:text-base font-medium text-foreground">
            {greeting}, <span className="font-semibold">{displayName}</span>
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm text-muted-foreground">{date}</p>
          <p className="text-xs text-muted font-mono">{time}</p>
        </div>
        <ThemeToggle />

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all duration-150"
          >
            {initial}
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl shadow-shadow animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted">@{user?.username}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Uitloggen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
