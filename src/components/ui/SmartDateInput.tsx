"use client";

import { useState, useEffect, useRef } from "react";

interface SmartDateInputProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  title?: string;
}

/**
 * Parse flexible date input into YYYY-MM-DD:
 * - "15"        → 15th of current month/year
 * - "15-3"      → March 15 of current year
 * - "15-3-25"   → March 15, 2025
 * - "15-3-2025" → March 15, 2025
 * - "2025-03-15" → as-is (ISO)
 * Separators: - / . or space
 */
function parseSmartDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const parts = trimmed.split(/[-/.\s]+/).map(Number);
  if (parts.some(isNaN) || parts.length === 0 || parts.length > 3) return null;

  let day: number, month: number, year: number;

  if (parts.length === 1) {
    day = parts[0];
    month = curMonth;
    year = curYear;
  } else if (parts.length === 2) {
    day = parts[0];
    month = parts[1];
    year = curYear;
  } else {
    // 3 parts — detect ISO vs DD-MM-YYYY
    if (parts[0] > 31) {
      // YYYY-MM-DD
      [year, month, day] = parts;
    } else {
      // DD-MM-YYYY
      [day, month, year] = parts;
      if (year < 100) year += 2000;
    }
  }

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** YYYY-MM-DD → "15-3-2025" (user-friendly, no zero-padding) */
function toDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)}-${parseInt(m)}-${y}`;
}

export default function SmartDateInput({ value, onChange, placeholder, className, title }: SmartDateInputProps) {
  const [display, setDisplay] = useState(toDisplay(value));
  const focused = useRef(false);

  // Sync display when external value changes (only when not focused)
  useEffect(() => {
    if (!focused.current) setDisplay(toDisplay(value));
  }, [value]);

  const commit = () => {
    const parsed = parseSmartDate(display);
    if (parsed !== null) {
      onChange(parsed);
      setDisplay(toDisplay(parsed));
    } else {
      // Invalid — revert
      setDisplay(toDisplay(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => setDisplay(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; commit(); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      placeholder={placeholder ?? "dd-mm-jjjj"}
      className={className}
      title={title}
    />
  );
}
