# Waypoint — Visie & Architectuur

> Sessie: 26 februari 2026

---

## De kern

Dit is geen productiviteitsapp. Dit is een **karakterontwikkelingssysteem** — een levenscompagnon die jou over jaren leert kennen en je helpt worden wie je wilt zijn.

**Doel over 5 jaar:** Een compleet ander persoon. Iemand die zichzelf beter kent, leeft naar zijn waarden en principes, disciplineerd is, afspraken nakomt en vaardig is.

Het verschil met bestaande tools:
- Alle huidige tools zijn **passief** — jij stopt data in, zij bewaren het
- Dit systeem is **actief** — het begrijpt jou, initieert, verrast, bouwt op zichzelf voort

---

## De drie lagen

```
Laag 3 — Intelligentie
         Proactief, conversationeel, schrijft terug naar data

Laag 2 — Unified Data API
         Één service, alles leesbaar én schrijfbaar voor de AI

Laag 1 — Data (alle bronnen)
         Alles wat data produceert over jouw leven
```

---

## Laag 1 — Data (compleet)

### Manuele modules (jij voert in, AI leest én schrijft)

| Module | Status | Omschrijving |
|--------|--------|--------------|
| Tasks | ✓ gebouwd | AI kan taken aanmaken vanuit gesprek |
| Habits | ✓ gebouwd | AI ziet streaks, gemiste dagen, patronen |
| Goals | ✓ gebouwd | AI ziet voortgang en stilstand |
| Notes | ✓ gebouwd | AI kan notities toevoegen |
| Calendar | ✓ gebouwd | AI ziet drukke periodes |
| Journal + Mood | ✗ bouwen | Dagelijkse reflecties, mood geïntegreerd. AI kan entries aanmaken vanuit gesprek |
| Finance | ✗ bouwen | YNAB-stijl: rekeningen, transacties, budgetten, budget vs. werkelijk, spaardoelen |
| People | ✗ bouwen | Relatie-CRM: alles over iemand dumpen, interacties loggen, dingen terughalen |
| Apple Health | ✗ bouwen | Slaap, stappen, hartslag, workouts — dashboard + AI leesbaar |

### Externe/automatische bronnen (later)
- Bankdata (koppeling aan Finance module)
- Weer API (correlatie met energie/productiviteit)
- Screen time
- GitHub activiteit

---

## Laag 2 — Unified Data API

Één service die alle data samenvoegt tot context die de intelligentie kan lezen. Jouw eigen "Microsoft Graph".

```typescript
getUserContext(userId) → {
  tasks:    openstaand, uitgesteld, recent afgerond
  habits:   streaks, gemiste dagen, patronen
  goals:    actief, stilstaand, voortgang
  calendar: komende events, drukke periodes
  journal:  recente entries, sentiment
  notes:    recent, gelinkt aan andere data
  health:   slaap, stappen, energie
  finance:  budget status, afwijkingen
  people:   recente interacties, openstaande follow-ups
}
```

---

## Laag 3 — Intelligentie

### Hoe het werkt (technisch)

**Gestructureerde data** (habits, tasks, goals) → nooit samenvatten, altijd vers berekenen vanuit database. Geen betrouwbaarheidsverlies.

**Ongestructureerde data** (journal, notes) → embeddings opslaan naast originele tekst. Semantisch zoeken bij relevante context. Origineel blijft altijd bewaard.

**Gebruikersprofiel** → klein, door jou gereviewed. Systeem stelt voor, jij bevestigt. Wordt meegestuurd bij elke AI-call.

**LLM-aanroepen** → database is het geheugen, niet het model. Elke call krijgt: profiel + berekende patronen + recente ruwe data.

### Wat de intelligentie doet

**Patronen herkennen** (code, geen AI nodig):
- Taak X is 3+ keer verschoven → signaal
- Ratio reactive vs intentioneel werk
- Habit gemist + drukke kalenderdag → correlatie
- Journal sentiment over tijd

**Interpreteren** (Claude API):
- Ruwe patronen omzetten naar menselijke inzichten
- Context: wie is Dion, wat zijn zijn waarden, wat speelt er

**Proactief initiatief**:
```
Systeem:  "Die offerte staat al 5 dagen open. Verstuurd?"
Jij:      "Nee nog niet"
Systeem:  "Wat houdt je tegen?"
Jij:      "Voel me er niet goed bij"
Systeem:  [maakt journal entry aan + signaal op taak]
          "Wil je er nu over nadenken of later?"
```

### De AI schrijft ook terug

De AI is niet alleen lezer maar ook schrijver:
- Gesprek → automatisch journal entry
- Gesprek → taak aanmaken
- Gesprek → notitie toevoegen aan persoon in People
- Gesprek → follow-up task bij People entry

---

## De interface

**Niet:** modules die je configureert
**Wel:** een gesprek dat data aanmaakt en beheert

De modules blijven bestaan als handmatige interfaces (taken toevoegen, calendar zien, journallen). Maar de AI-laag werkt conversationeel — jij praat, het systeem handelt.

Voorbeelden:
```
"Ik moet die offerte nog sturen"        → taak aangemaakt
"Ik voel me al een week moe"            → signaal + journal
"Had goed gesprek met Lisa, wil samen-  → notitie bij Lisa
 werken"                                   + follow-up task
```

---

## Kernprincipes

**1. Karakter, niet productiviteit**
Het systeem vraagt niet "wat deed je vandaag?" maar "wie werd je vandaag?"

**2. De kloof is de informatie**
Je zegt discipline te waarderen maar 0 uur ging ernaar. Die kloof is het kompas, niet een aanval.

**3. Waarden als wortel**
Alles traceert terug naar waarden. Als iets niet verbindt aan een waarde, is het administratie of hoort het niet in je leven.

**4. Geduldig systeem**
Waarden hoef je niet op dag 1 te weten. Het systeem ontdekt ze door terug te kijken op je gedrag. Na genoeg data suggereert het: *"dit lijkt belangrijk voor jou."*

**5. Betrouwbaarheid boven slimheid**
Gestructureerde data nooit samenvatten — altijd vers berekenen. Ongestructureerde data embedden, niet samenvatten. Profiel klein en door gebruiker gereviewed houden.

---

## Bouwvolgorde

```
Stap 1   Journal + Mood module bouwen
Stap 2   Finance module bouwen (YNAB-stijl)
Stap 3   People module bouwen (relatie-CRM)
Stap 4   Apple Health integratie
         → Laag 1 compleet

Stap 5   Unified Data API bouwen
         → Laag 2 compleet

Stap 6   Claude API integratie (basis chat met je data)
Stap 7   Proactieve checks (systeem initieert)
Stap 8   Embeddings (semantisch zoeken in journal/notes)
Stap 9   Externe bronnen (bankdata, weer, etc.)
         → Laag 3 compleet
```

---

## Wat het systeem over 5 jaar zegt

Niet: *"Je hebt 847 tasks afgerond."*

Maar: *"In 2024 was je iemand die veel beloofde maar moeite had om het vol te houden. Begin 2025 begon er iets te verschuiven — je commitments werden kleiner maar consistenter. Eind 2025 was er een kantelpunt: je ging van iemand die discipline nastreefde naar iemand die het gewoon was."*

Dat is het product.
