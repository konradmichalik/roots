# SPEC: Rules Overhaul

## Status: Draft

## Motivation

Das Rules-Feature hat sich als tragfähig erwiesen, stößt aber bei wachsender Nutzung an UX- und Funktionsgrenzen:

1. **Platz:** Das Modal (`max-w-2xl`) wird bei vielen Rules eng — kein Platz für Kontext oder Vorschau.
2. **Übersicht:** Keine Sortier-/Filterfunktionen außer einer einfachen Textsuche (ab 5 Rules).
3. **Formular-Komplexität:** Trigger, Target, Template, Toggles — alles in einem Formular (`max-w-md`). Bei neuen Matchern wird das unübersichtlich.
4. **Jira-Matching zu simpel:** Aktuell nur `projectKey` + optionales `issuePattern` (Wildcard/Exact). Reale Anforderungen: Epic-basiert, Component-basiert, Label-basiert, Stichwort-Suche in Summary.

---

## Phase 1: UI-Verbesserungen (Rules Modal + Editor)

### 1.1 Größeres Rules Modal

**Aktuell:** `sm:max-w-2xl` (672px)
**Neu:** `sm:max-w-4xl` (896px) oder `sm:max-w-5xl` (1024px)

**Entscheidung:** Breites Modal ohne Split-Layout. Split-Layout kann in Zukunft ergänzt werden, wenn sich herausstellt, dass es bei vielen Rules nötig wird.

### 1.2 Sortier- und Filterfunktionen

**Aktuell:** Textsuche (ab 5 Rules), Drag-to-Reorder.

**Neu — Filter:**

| Filter | Typ | Werte |
|--------|-----|-------|
| Source-Typ | Toggle/Chips | Jira, Outlook, Alle |
| Moco-Kunde | Dropdown | Aus vorhandenen Rules extrahiert |
| Moco-Projekt | Dropdown | Aus vorhandenen Rules extrahiert |
| Status | Toggle/Chips | Aktiv, Pausiert, Stale |
| Auto-Sync | Toggle | Ja/Nein |

**Neu — Sortierung:**

| Sortierung | Beschreibung |
|------------|--------------|
| Priorität (Default) | `sortOrder` — wie heute |
| Name A-Z / Z-A | Alphabetisch |
| Zuletzt bearbeitet | `updatedAt` desc |
| Zuletzt synchronisiert | Aus SyncRecords |
| Kunde/Projekt | Gruppiert nach Moco-Target |

Filter und Sortierung als kompakte Toolbar über der Liste (Chips + Dropdown), kollapst wenn weniger als 5 Rules.

### 1.3 Mehrstufiger Rule-Editor (Wizard)

**Aktuell:** Ein einzelnes Formular mit allen Feldern.

**Neu:** 3-Step-Wizard im Editor-Modal (größer: `sm:max-w-lg` oder `sm:max-w-xl`):

#### Step 1: Source / Trigger

- Source-Typ wählen (Jira / Outlook)
- Source-spezifische Felder (je nach Typ, siehe Phase 2 für erweiterte Jira-Matcher)
- Sofortige Vorschau: "Matches X entries from today" (Live-Count)

#### Step 2: Target / Action

- Moco Projekt (Combobox)
- Moco Task (Combobox, abhängig von Projekt)
- Description Template + Variable-Buttons + Preview

#### Step 3: Optionen & Zusammenfassung

- Name (mit Auto-Suggestion basierend auf Source/Target, z.B. "SUP → Moco Support")
- Enabled / Auto-Sync Toggles
- Overlap-Warning
- **Zusammenfassung:** Kompakte Vorschau der gesamten Rule

**Navigation:** Stepper-Indicator oben, Back/Next Buttons unten, direktes Klicken auf Steps erlaubt (wenn validiert).

**Validierung pro Step:**
- Step 1: Source-Felder ausgefüllt
- Step 2: Projekt + Task gewählt
- Step 3: Name ausgefüllt

**Quick-Create (Kontextmenü):** Wird beibehalten. Wenn eine Rule aus dem Kontextmenü einer TimeEntry erstellt wird, öffnet sich der Wizard mit vorausgefülltem Step 1 (Source aus Entry-Metadaten) und springt direkt zu Step 2 (Target). Der User muss nur noch Projekt/Task wählen und einen Namen vergeben.

---

## Phase 2: Erweiterte Jira-Matcher

### 2.1 Neue Matcher-Typen

Das `JiraSourceMatcher`-Interface wird von einem einfachen `projectKey`-Match zu einem kombinierbaren Filtersystem erweitert.

**Aktuelles Interface:**
```typescript
interface JiraSourceMatcher {
  type: 'jira';
  connectionId: string;
  projectKey: string;
  issuePattern?: string;
}
```

**Neues Interface:**
```typescript
interface JiraSourceMatcher {
  type: 'jira';
  connectionId: string;
  projectKey: string;

  // Matcher-Felder (alle optional, kombinierbar mit AND-Logik)
  issuePattern?: string;       // "SUP-42" oder "SUP-*" (wie bisher)
  epicKey?: string;            // "SUP-100" — alle Issues unter diesem Epic
  component?: string;          // "Backend" — Jira-Component
  labels?: string[];           // ["billable", "clientX"] — mindestens eins muss matchen (OR)
  summaryContains?: string;    // Stichwort im Issue-Summary
  jql?: string;                // Freie JQL-Query (Power-User, überschreibt alle anderen Filter)
}
```

**Kombinations-Logik:**
- Alle gesetzten Felder werden mit **AND** verknüpft
- `labels` intern mit **OR** (mindestens ein Label muss matchen)
- `issuePattern` hat weiterhin höchste Spezifität
- Leere/nicht gesetzte Felder werden ignoriert
- `jql` ist ein **Advanced-Modus**: Wenn gesetzt, wird die JQL-Query serverseitig ausgeführt und die resultierenden Issue-Keys als Match-Set verwendet. Die anderen Filter-Felder werden dann ignoriert. Matching geschieht über einen vorgeladenen Set: beim Sync wird die JQL-Query einmalig ausgeführt, die Issue-Keys gecacht, und dann gegen `entry.metadata.issueKey` geprüft.

**Beispiele:**

| Regel | projectKey | epicKey | component | labels | summaryContains | Matched |
|-------|-----------|---------|-----------|--------|-----------------|---------|
| "Alles aus SUP" | SUP | — | — | — | — | Alle SUP-Issues |
| "SUP Feature X" | SUP | SUP-100 | — | — | — | Alle Issues unter Epic SUP-100 |
| "SUP Backend" | SUP | — | Backend | — | — | Alle SUP-Issues mit Component "Backend" |
| "Migration Tasks" | SUP | — | — | ["migration"] | — | Alle SUP-Issues mit Label "migration" |
| "SUP Meetings" | SUP | — | — | — | "meeting" | Alle SUP-Issues mit "meeting" im Summary |
| "Komplex" | SUP | SUP-100 | Backend | ["billable"] | — | SUP + Epic SUP-100 + Component Backend + Label billable |

### 2.2 Erweiterte Jira-Metadaten

**Problem:** Die aktuelle `JiraMetadata` hat nur `issueKey`, `issueSummary`, `issueType`, `projectKey`. Epic, Components und Labels werden weder abgefragt noch gespeichert.

**Erweiterung `JiraMetadata`:**
```typescript
interface JiraMetadata {
  source: 'jira';
  worklogId: string;
  issueKey: string;
  issueSummary: string;
  issueType?: string;
  projectKey?: string;

  // Neu:
  epicKey?: string;          // Parent Epic Key (z.B. "SUP-100")
  components?: string[];     // Jira Components (z.B. ["Backend", "API"])
  labels?: string[];         // Jira Labels (z.B. ["billable", "migration"])
}
```

**Erweiterung `JiraIssue` (API-Response):**
```typescript
interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; iconUrl?: string };
    project: { key: string; name: string };
    worklog?: JiraWorklogResponse;

    // Neu — müssen in der JQL-Query angefordert werden:
    parent?: { key: string; fields?: { issuetype?: { name: string } } };
    components?: Array<{ name: string }>;
    labels?: string[];
    // Server: customfield_10001 (Epic Link) — als Fallback
  };
}
```

**Jira API-Anpassung:**
- JQL-Felder erweitern: `fields=summary,issuetype,project,worklog,parent,components,labels`
- Epic-Erkennung: `parent.fields.issuetype.name === 'Epic'` (Cloud) oder `customfield_10001` (Server, Fallback)
- Kein zusätzlicher API-Call nötig — die Felder kommen mit der bestehenden Search-Query
- Labels: Autocomplete via Jira REST API (`/rest/api/2/label` bzw. `/rest/api/3/label`) — einmaliger Abruf beim Öffnen des Editors, gecacht für die Session

### 2.3 Matching-Logik erweitern

**Aktuell:** `matchesJiraSource()` prüft nur `issuePattern` und `projectKey`.

**Neu:**
```
matchesJiraSource(entry, source):
  0. Wenn jql gesetzt → entry.metadata.issueKey muss im vorgeladenen JQL-Result-Set sein (return)
  1. projectKey muss immer matchen (Pflichtfeld)
  2. Wenn issuePattern gesetzt → muss matchen (Exact/Wildcard)
  3. Wenn epicKey gesetzt → entry.metadata.epicKey muss === epicKey
  4. Wenn component gesetzt → entry.metadata.components muss component enthalten
  5. Wenn labels gesetzt → mindestens ein Label aus source.labels in entry.metadata.labels
  6. Wenn summaryContains gesetzt → entry.metadata.issueSummary.includes(summaryContains)
  Alle Checks (1-6) mit AND verknüpft. JQL (0) ist exklusiv.
```

**Spezifitäts-Score erweitern:**

| Matcher-Kombination | Score | Erklärung |
|---------------------|-------|-----------|
| JQL | 11 | Höchste Priorität — Advanced User konfiguriert bewusst |
| Exact Issue Key | 10 | Einzelnes Ticket |
| Wildcard Pattern | 8 | z.B. "SUP-1*" |
| Epic + Component + Label | 7 | Dreifach-Filter |
| Epic + Component | 6 | Doppel-Filter |
| Epic / Component + Label | 5 | Doppel-Filter |
| Epic / Component / Label allein | 4 | Einzel-Filter |
| Summary Contains | 3 | Fuzzy, niedrig priorisiert |
| Project-Level | 1 | Catch-all |

### 2.4 Multi-Match-Hinweis (Conflict Detection)

Wenn mehrere Rules auf denselben Worklog matchen, soll das sichtbar gemacht werden — auch wenn intern nur die höchstpriorisierte Rule angewendet wird.

**Sync-Preview:** Entries, bei denen >1 Rule gematcht hätte, erhalten ein Warning-Badge:
- "2 rules matched — applied: *Rule A* (Score 10). Also matched: *Rule B* (Score 4)."
- Klick auf den Hinweis öffnet Details mit allen matchenden Rules

**Rules-Liste:** In der RulesModal-Übersicht:
- Neue Spalte/Badge: "Conflicts" mit Anzahl der Entries, die von mehreren Rules beansprucht werden
- Nur angezeigt wenn Conflicts > 0
- Hilft beim Erkennen, ob Rules zu breit konfiguriert sind

**Sync Log:** Conflict-Info wird im SyncRecord mitgespeichert:
```typescript
interface SyncRecord {
  // ... bestehende Felder
  competingRuleIds?: string[];  // IDs der Rules, die ebenfalls gematcht hätten
}
```

**Kein Blocker:** Conflicts verhindern den Sync nicht. Sie sind rein informativer Natur und helfen dem User, seine Rules zu optimieren.

### 2.4 JiraSourceForm erweitern

**Aktuell:** 2 Felder (Project Key, Issue Pattern).

**Neu:** Dynamisches Formular mit optionalen Filtern:

```
┌─────────────────────────────────────────┐
│ Project Key*         [SUP        ]      │
│                                         │
│ + Add Filter                            │
│                                         │
│ ┌─ Issue Pattern ──────────────────┐    │
│ │ [SUP-42 or SUP-*              ] │    │
│ └──────────────────────────────────┘    │
│ ┌─ Epic ───────────────────────────┐    │
│ │ [SUP-100                      ] │    │
│ └──────────────────────────────────┘    │
│ ┌─ Component ──────────────────────┐    │
│ │ [Backend                      ] │    │
│ └──────────────────────────────────┘    │
│ ┌─ Labels ─────────────────────────┐    │
│ │ [billable] [migration] [+]     │    │
│ └──────────────────────────────────┘    │
│ ┌─ Summary Contains ──────────────┐    │
│ │ [meeting                      ] │    │
│ └──────────────────────────────────┘    │
│                                         │
│ ℹ Matches X entries from today          │
└─────────────────────────────────────────┘
```

- Project Key bleibt Pflichtfeld (außer im JQL-Modus)
- "Add Filter"-Button zeigt ein Dropdown mit verfügbaren Filtern
- Jeder Filter hat einen Remove-Button (×)
- Filter sind optional und beliebig kombinierbar
- Live-Match-Count zeigt sofortiges Feedback
- Labels: Autocomplete-Combobox, lädt Labels via Jira API (`/rest/api/2/label` bzw. `/rest/api/3/label`), Session-gecacht
- **Advanced-Toggle (JQL):** Umschalten auf ein Freitext-Textarea für JQL. Wenn aktiv, werden alle anderen Filter ausgeblendet. Hinweis: "JQL wird serverseitig ausgeführt — nur Issue-Keys aus dem Ergebnis werden gematcht."

---

## Phase 3: Datenqualität & UX-Polish

### 3.1 Live-Match-Preview im Editor

Beim Erstellen/Bearbeiten einer Rule:
- Entries des aktuellen Tages gegen die konfigurierte Source matchen
- Anzeige: "Would match 5 entries from today" mit aufklappbarer Liste
- Hilft bei der Validierung der Matcher-Konfiguration

### 3.2 Rule-Duplikat-Erkennung verbessern

`findOverlappingRules()` muss die neuen Matcher-Felder berücksichtigen:
- Zwei Rules mit gleichem `projectKey` aber unterschiedlichem `epicKey` überlappen nicht
- Zwei Rules mit gleichem `projectKey` und `epicKey` aber unterschiedlichen Components überlappen nicht

### 3.3 Migration bestehender Rules

- Bestehende Rules behalten ihre Struktur — neue Felder sind alle optional
- Keine Migration nötig, da `epicKey`, `component`, `labels`, `summaryContains` default `undefined`
- Bestehende Matching-Logik bleibt als Fallback erhalten

---

## Abhängigkeiten & Risiken

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| Jira API liefert keine Epic/Component/Label-Daten | Phase 2 blockiert | JQL-Fields erweitern, in Phase 2.2 adressiert |
| Epic-Feld unterschiedlich in Cloud vs. Server | Falsches Matching | `parent`-Feld (Cloud) + `customfield_10001` (Server) als Fallback |
| Performance bei vielen Matchern | Langsame Sync-Preview | Matching ist In-Memory, kein API-Call — sollte unkritisch sein |
| JQL-Queries können langsam/fehlerhaft sein | Sync blockiert | Timeout + Fehlerbehandlung, JQL-Ergebnis cachen |
| Wizard-UX könnte Quick-Create verlangsamen | Weniger Nutzung | Quick-Create bleibt erhalten, Wizard startet vorausgefüllt ab Step 2 |
| Bestehende Rules brechen | Datenverlust | Alle neuen Felder optional, kein Breaking Change |
| Label-API nicht verfügbar (Server) | Kein Autocomplete | Fallback auf Freitext-Input |

---

## Umsetzungsreihenfolge

```
Phase 1.1  Größeres Modal              → Schneller Win, eigenständig
Phase 1.2  Filter/Sort                 → Eigenständig, braucht nur Modal-Platz
Phase 1.3  Wizard-Editor               → Kann parallel zu 1.2
Phase 2.2  Jira-Metadaten erweitern    → Voraussetzung für 2.1/2.3
Phase 2.1  Neue Matcher-Typen          → Braucht 2.2
Phase 2.3  Matching-Logik              → Braucht 2.1
Phase 2.4  Multi-Match / Conflicts      → Braucht 2.3
Phase 2.5  JiraSourceForm erweitern    → Braucht 2.1 + 1.3 (Wizard)
Phase 3    Polish                      → Nach Phase 2
```

---

## Entschiedene Fragen

1. **Split-Layout vs. breites Modal:** Breites Modal ohne Split-Layout. Kann in Zukunft ergänzt werden.
2. **Quick-Create:** Bleibt erhalten. Wizard öffnet vorausgefüllt (Step 1 aus Entry-Metadaten, Start ab Step 2).
3. **JQL:** Ja, als Advanced-Toggle im JiraSourceForm. Exklusiv-Modus, ersetzt alle anderen Filter.
4. **Jira Server Epic-Feld:** `customfield_10001`.
5. **Label-Autocomplete:** Ja, via Jira REST API. Fallback auf Freitext wenn API nicht verfügbar.
6. **JQL-Spezifitäts-Score:** Score 11 (höchster). Advanced User konfiguriert bewusst, Rule gewinnt immer.
7. **Component-Autocomplete:** Ja, via `/rest/api/2/project/{key}/components`. Fallback auf Freitext.
8. **JQL-Cache-TTL:** 5 Minuten, analog zu timeEntries-Cache.
9. **Multi-Match:** Kein Blocker, rein informativ. Warning-Badge in Sync-Preview + Conflicts-Anzeige in Rules-Liste.
