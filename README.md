# Waypoint

> A life companion that knows you better over time — and helps you become who you want to be.

---

## What is this?

Most productivity apps are passive. You put data in, they store it. Waypoint is different.

This is a **character development system** — a personal life companion built around one idea: that the most valuable thing software can do for you is not help you do more, but help you *become more*.

The goal is not to track tasks. The goal is that in 5 years, you look back and can see exactly who you were becoming — and the system helped you get there.

---

## The vision

Most life management tools are organized around **doing**. Waypoint is organized around **becoming**.

The difference: a to-do list asks *"what should I do today?"* This system asks *"who am I becoming through what I do today?"*

Over time, the system builds a model of you — your patterns, your energy, your values, your commitments. It notices things you don't. It connects dots you wouldn't have connected. And it tells you things about yourself that surprise you.

---

## Architecture

The system is built in three layers:

### Layer 1 — Data
Every module is a data source. The richer the data, the smarter the system.

| Module | Status | Description |
|--------|--------|-------------|
| Tasks | Live | Projects, deadlines, commitments |
| Habits | Live | Daily routines with streaks and heatmaps |
| Goals | Live | Long-term goals with milestones |
| Notes | Live | Personal knowledge base |
| Calendar | Live | Events and time management |
| Journal + Mood | Building | Daily reflections with mood tracking |
| Finance | Building | YNAB-style budgeting and expense tracking |
| People | Building | Relationship CRM — remember everything about everyone |
| Apple Health | Building | Sleep, steps, workouts — automatic sync |

### Layer 2 — Unified Data API
One service that assembles context from all modules — a personal Microsoft Graph. The intelligence layer reads and writes through this single interface.

### Layer 3 — Intelligence
The layer that makes the system come alive. Built on Claude API.

- **Reads** all your data across all modules
- **Writes** back — creates tasks, journal entries, notes from conversation
- **Recognizes patterns** — statistical analysis of your behavior over time
- **Proactively initiates** — doesn't wait for you to ask

Example:
```
System: "That quote for client X has been open for 5 days. Sent?"
You:    "No, not yet"
System: "What's holding you back?"
You:    "Don't feel good about it"
System: [creates journal entry + flags the task]
        "Want to think it through now or later?"
```

The conversation *is* the data entry. You don't open a journal and write — you just talk.

---

## Core principles

**Character, not productivity**
The system doesn't ask what you did today. It asks who you became today.

**The gap is the information**
You say you value discipline but zero hours went toward it this week. That gap is a compass, not an accusation.

**Values as the root**
Everything traces back to values. If something doesn't connect to a value, it's either administration or it shouldn't be in your life.

**Patient by design**
You don't need to know your values on day one. The system discovers them by looking at your behavior. After enough data, it suggests: *"this seems important to you."*

**The database is the memory**
The AI doesn't learn — your database does. Every call includes a curated profile of who you are, computed patterns, and recent raw data. The system gets smarter as you use it longer.

**Reliability over cleverness**
Structured data (habits, tasks, goals) is never summarized — always freshly computed from the database. Unstructured data (journal, notes) is embedded and retrieved semantically, never compressed into lossy summaries.

---

## What it says after 5 years

Not: *"You completed 847 tasks."*

But: *"In 2024 you were someone who made a lot of promises but struggled to keep them. In early 2025 something started shifting — your commitments got smaller but more consistent. By late 2025 there was a turning point: you stopped chasing discipline and just became it."*

That's the product.

---

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma
- **AI:** Claude API (Anthropic)
- **Styling:** Tailwind CSS with Revolut-inspired UI

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env` and configure your database and API keys.

---

## Status

Active development. Layer 1 (data modules) is nearly complete. Layer 2 (unified API) and Layer 3 (intelligence) are next.

This is a personal project built in public. Follow along.
