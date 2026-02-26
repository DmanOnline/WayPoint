"use client";

import { useEffect, useState } from "react";

interface QuoteData {
  quote: string;
  author: string;
}

export default function QuoteOfDay() {
  const [data, setData] = useState<QuoteData | null>(null);

  useEffect(() => {
    fetch("/api/quote")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-6 py-5 transition-colors duration-200 animate-fade-in flex flex-col justify-center">
      <p className="text-sm md:text-base text-foreground/80 italic leading-relaxed">
        &ldquo;{data.quote}&rdquo;
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        &mdash; {data.author}
      </p>
    </div>
  );
}
