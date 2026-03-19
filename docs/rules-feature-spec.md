# Rules Feature — Anforderungs- & Umsetzungsdokument

> **Status: Experimental** — This feature is functional but under active development. Interfaces and behavior may change.

## 1. Vision

**Ziel:** Zeitbuchungen nur noch in Jira erfassen und automatisch nach Moco übertragen. Rules definieren, welches Jira-Projekt/Ticket auf welche Moco-Buchungsposition (Project + Task) gebucht wird. Outlook-Termine können ebenfalls über Rules automatisch übertragen werden.

**Abgrenzung zu Favorites:** Reguläre Favorites (Quick-Book-Buttons ohne Event-Match) bleiben erhalten. Event-Favorites werden durch Outlook-Rules ersetzt — Rules sind das mächtigere Konzept mit Deduplizierung, Lifecycle-Management und optionaler Auto-Übertragung.

---

## 2. Begriffe

| Begriff            | Bedeutung                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| **Rule**           | Mapping-Definition: Quelle (Jira/Outlook) → Ziel (Moco Project + Task) |
| **Source Matcher** | Kriterium, das bestimmt welche Einträge eine Rule matcht               |
| **Target**         | Moco-Buchungsposition (Project ID + Task ID)                           |
| **Sync Record**    | Verknüpfung zwischen Quell-Eintrag und erzeugtem Moco-Eintrag          |
| **Stale Target**   | Moco-Task, die nicht mehr aktiv/verfügbar ist                          |

---

## 3. Anforderungen

### 3.1 Rule-Definition

#### 3.1.1 Source Matcher — Jira

| Feld               | Beschreibung                                                                       |
| ------------------ | ---------------------------------------------------------------------------------- |
| `sourceType`       | `'jira'`                                                                           |
| `jiraProjectKey`   | Jira-Projekt-Key (z.B. `"SUP"`, `"DEV"`) — matcht alle Worklogs in diesem Projekt  |
| `jiraIssuePattern` | Optional: Spezifischeres Matching auf Issue-Key-Ebene (z.B. `"SUP-*"`, `"DEV-42"`) |
| `jiraConnectionId` | Referenz auf die verwendete Jira-Verbindung (multi-connection-fähig)               |

**Matching-Logik (Priorität):**

1. Exakter Issue-Key-Match (`DEV-42`) — höchste Priorität
2. Projekt-Key-Match (`SUP`) — matcht alle Issues im Projekt
3. Bei Overlap gewinnt die spezifischere Rule

#### 3.1.2 Source Matcher — Outlook

| Feld           | Beschreibung                                |
| -------------- | ------------------------------------------- |
| `sourceType`   | `'outlook'`                                 |
| `eventPattern` | Text-Pattern für Event-Titel                |
| `matchType`    | `'contains'` \| `'exact'` \| `'startsWith'` |

> Entspricht dem bestehenden `FavoriteEventMatch`-Konzept, wird aber in Rules integriert.

#### 3.1.3 Target (Moco)

| Feld              | Beschreibung               |
| ----------------- | -------------------------- |
| `mocoProjectId`   | Moco Project ID            |
| `mocoTaskId`      | Moco Task ID               |
| `mocoProjectName` | Denormalisiert für Anzeige |
| `mocoTaskName`    | Denormalisiert für Anzeige |
| `customerName`    | Denormalisiert für Anzeige |

#### 3.1.4 Optionale Felder

| Feld                  | Beschreibung                                                             |
| --------------------- | ------------------------------------------------------------------------ |
| `name`                | Benutzerfreundlicher Name der Rule                                       |
| `descriptionTemplate` | Template für die Moco-Beschreibung, z.B. `"{issueKey} – {issueSummary}"` |
| `enabled`             | Rule an/aus                                                              |
| `autoSync`            | Automatisch übertragen oder nur vorschlagen                              |

### 3.2 Deduplizierung (Sync Records)

**Problem:** Worklogs dürfen nicht doppelt nach Moco übertragen werden.

**Lösung:** Ein persistierter `syncRecords`-Store, der jede erfolgreiche Übertragung festhält:

```typescript
interface SyncRecord {
  id: string; // UUID
  ruleId: string; // Welche Rule hat die Übertragung ausgelöst
  sourceType: 'jira' | 'outlook';
  sourceId: string; // Jira: worklogId, Outlook: eventId
  sourceKey: string; // Jira: issueKey, Outlook: eventTitle
  mocoActivityId: number; // Erzeugte Moco Activity ID
  mocoDate: string; // YYYY-MM-DD
  hours: number;
  syncedAt: string; // ISO timestamp
  autoSynced: boolean; // true = automatisch, false = manuell ausgelöst
}
```

**Dedup-Check:** Vor jeder Übertragung: `syncRecords.find(r => r.sourceType === type && r.sourceId === id)`. Existiert ein Record, wird der Eintrag übersprungen.

**Zusätzlicher Schutz:** Prüfung über `MocoActivity.remote_id` — wenn bereits ein Moco-Eintrag mit `remote_service: 'jira'` und `remote_id: issueKey` für dasselbe Datum existiert, Warnung statt blindes Erstellen.

### 3.3 Target-Lifecycle / Stale-Target-Alarm

**Problem:** Moco-Buchungspositionen wie "Support März" werden monatlich geschlossen und durch neue ersetzt.

**Lösung:**

1. **Validierung beim Sync:** Vor jeder Übertragung wird geprüft, ob `mocoTaskId` noch in den aktiven Tasks des Projekts existiert (`mocoProjectsState.projects`).
2. **Periodische Validierung:** Bei jedem App-Start und bei jedem Projekt-Refresh werden alle Rules gegen die aktiven Tasks geprüft.
3. **Alert-Zustände:**
   - `valid` — Task aktiv und verfügbar
   - `stale` — Task nicht mehr in aktiven Tasks gefunden → Rule wird pausiert, User wird benachrichtigt
   - `unknown` — Projekts nicht geladen (offline etc.)

**UI-Anzeige:**

- Stale Rules werden mit Warn-Badge angezeigt
- Toast-Notification bei Erkennung einer stale Rule
- Quick-Action: "Task aktualisieren" öffnet Task-Picker mit dem gleichen Projekt vorausgewählt

### 3.4 Sync-Ausführung

#### 3.4.1 Manueller Sync

- Button "Apply Rules" in der Day-View: Findet alle ungebuchten Jira-Worklogs/Outlook-Events des Tages, die eine Rule matchen, und zeigt eine Preview-Liste
- User bestätigt die Übertragung (Batch oder einzeln)
- Nach Bestätigung: Moco-Einträge erstellen, Sync Records speichern

#### 3.4.2 Automatischer Sync

- Opt-in per Rule (`autoSync: true`)
- Trigger: Beim Laden der Tages-Einträge (`fetchDayEntries`)
- Ablauf:
  1. Jira-Worklogs und Outlook-Events für den Tag laden
  2. Gegen Rules matchen
  3. Gegen Sync Records und existierende Moco-Einträge dedup-prüfen
  4. Neue Einträge automatisch erstellen
  5. Sync Records speichern
  6. UI-Feedback: Toast "3 Einträge automatisch übertragen"
- **Sicherheit:** Nur für **heute**, nie rückwirkend. Vergangene Tage nur über manuellen Trigger (§3.4.1)
- **Hinweis bei ungebuchten Tagen:** Wenn vergangene Tage matchende aber ungebuchte Worklogs enthalten, zeigt die App einen Hinweis: "X ungebuchte Tage mit matchenden Worklogs" — bucht aber nicht automatisch

#### 3.4.3 Bulk-Sync (Erweiterung, Phase 2)

- Möglichkeit, Rules für einen Zeitraum (z.B. letzte Woche) nachträglich auszuführen
- Immer manuell mit Preview

### 3.5 Visuelle Kennzeichnung

Moco-Einträge, die durch Rules erstellt wurden, erhalten:

1. **Icon-Badge:** Kleines Automatisierungs-Icon (z.B. Lucide `bot` oder `zap`) neben dem Eintrag
2. **Tooltip:** "Automatisch übertragen via Rule '{ruleName}' am {syncedAt}"
3. **Erkennung:** Entweder über `syncRecords` (sourceId-Match) oder über ein spezielles Beschreibungs-Prefix/Suffix

> Empfehlung: Primär über Sync Records erkennen, da das Beschreibungsfeld dem User gehört und manipulierbar ist.

### 3.6 Verhältnis zu Favorites

**Event-Favorites werden durch Outlook-Rules ersetzt.** Rules bieten alles was Event-Favorites können, plus Deduplizierung, Lifecycle-Management und optionale Auto-Übertragung.

**Reguläre Favorites (ohne Event-Match) bleiben erhalten** als Quick-Book-Buttons für manuelle Buchungen ohne Quell-Eintrag.

| Feature        | Reguläre Favorites                     | Rules                                     |
| -------------- | -------------------------------------- | ----------------------------------------- |
| Zweck          | Quick-Book-Button (kein Quell-Eintrag) | Übertragung von Quell-Einträgen nach Moco |
| Quellen        | Keine                                  | Jira-Worklogs + Outlook-Events            |
| Ausführung     | Manuell (Klick)                        | Manuell oder automatisch                  |
| Deduplizierung | Keine (nicht nötig)                    | Sync Records                              |
| Lifecycle-Mgmt | Keine                                  | Stale-Target-Alarm                        |

**Migration:** Beim ersten Start nach dem Update werden bestehende Event-Favorites automatisch in Outlook-Rules konvertiert. Reguläre Favorites bleiben unverändert.

### 3.7 Outlook-Rules — Einstieg und Stunden-Überschreibung

#### Bottom-up-Einstieg (primärer Flow)

1. User sieht Outlook-Event in der Timeline (z.B. "Team Weekly")
2. Action am Event → "Rule erstellen"
3. RuleEditorModal öffnet sich vorausgefüllt:
   - Source: `outlook`, Pattern: Event-Titel, MatchType: `contains`
   - Target: leer — User wählt Moco Project + Task
   - Description-Template: `"{eventTitle}"`
   - Stunden: Event-Dauer vorausgefüllt, überschreibbar
4. Speichern → Rule matcht ab sofort alle Events mit diesem Pattern

#### Top-down-Einstieg (alternativ)

Über RulesModal → "Neue Rule" → Source: Outlook wählen, Pattern manuell eingeben.

#### Stunden-Überschreibung

Outlook-Rules haben ein optionales Feld `overrideHours`:

- **Nicht gesetzt:** Event-Dauer wird übernommen (Berechnung wie bisher über `calculateEventHours`)
- **Gesetzt:** Fester Wert überschreibt die Event-Dauer (z.B. "Team Weekly ist 1h, ich buche nur 0.5h")

---

## 4. Datenmodell

### 4.1 Rule Type

```typescript
interface Rule {
  id: string; // UUID
  name: string; // z.B. "Support-Tickets → Moco Support"
  enabled: boolean;
  autoSync: boolean; // Automatisch oder nur Vorschlag

  // Source
  source: JiraSourceMatcher | OutlookSourceMatcher;

  // Target
  target: {
    mocoProjectId: number;
    mocoTaskId: number;
    mocoProjectName: string; // Denormalisiert
    mocoTaskName: string; // Denormalisiert
    customerName: string; // Denormalisiert
  };

  // Beschreibung
  descriptionTemplate: string; // z.B. "{issueKey} – {issueSummary}"

  // Metadata
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  targetStatus: 'valid' | 'stale' | 'unknown';
}

interface JiraSourceMatcher {
  type: 'jira';
  connectionId: string; // Referenz auf Jira-Connection
  projectKey: string; // z.B. "SUP"
  issuePattern?: string; // Optional: "SUP-*", "SUP-42"
}

interface OutlookSourceMatcher {
  type: 'outlook';
  eventPattern: string;
  matchType: 'contains' | 'exact' | 'startsWith';
  overrideHours?: number; // Optional: fester Stundenwert statt Event-Dauer
}
```

### 4.2 Sync Record Type

```typescript
interface SyncRecord {
  id: string;
  ruleId: string;
  sourceType: 'jira' | 'outlook';
  sourceId: string; // worklogId oder eventId
  sourceKey: string; // issueKey oder eventTitle
  mocoActivityId?: number; // Optional: nur bei status 'success'
  mocoDate: string; // YYYY-MM-DD
  hours: number;
  description: string;
  syncedAt: string; // ISO timestamp
  autoSynced: boolean;
  status: 'success' | 'failed';
  errorReason?: string; // z.B. "stale_target", "api_error", "rate_limit"
}
```

### 4.3 Storage Keys

```typescript
// In STORAGE_KEYS erweitern:
RULES: 'roots:rules';
SYNC_RECORDS: 'roots:syncRecords';
```

---

## 5. Store-Design

### 5.1 `rules.svelte.ts`

```typescript
export const rulesState = $state<{
  rules: Rule[];
}>({ rules: [] });

// Initializer
export async function initializeRules(): Promise<void>;

// CRUD
export function addRule(
  rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'targetStatus'>
): void;
export function updateRule(id: string, updates: Partial<Rule>): void;
export function removeRule(id: string): void;
export function reorderRules(ids: string[]): void;

// Matching
export function findMatchingRules(entry: UnifiedTimeEntry): Rule[];
export function getUnmatchedEntries(entries: UnifiedTimeEntry[]): UnifiedTimeEntry[];

// Validation
export function validateRuleTargets(): void; // Prüft alle Rules gegen mocoProjectsState
export function getRulesWithStatus(status: Rule['targetStatus']): Rule[];
```

### 5.2 `syncRecords.svelte.ts`

```typescript
export const syncRecordsState = $state<{
  records: SyncRecord[];
}>({ records: [] });

export async function initializeSyncRecords(): Promise<void>;

// Dedup
export function isSynced(sourceType: string, sourceId: string): boolean;
export function getSyncRecord(sourceType: string, sourceId: string): SyncRecord | undefined;

// CRUD
export function addSyncRecord(record: Omit<SyncRecord, 'id' | 'syncedAt'>): void;
export function removeSyncRecord(id: string): void;
export function getSyncRecordsForDate(date: string): SyncRecord[];
export function getSyncRecordsForRule(ruleId: string): SyncRecord[];

// Statistik
export function getLastSyncForRule(ruleId: string): { date: string; count: number } | null;
export function getSyncCountForRule(ruleId: string): number;

// Cleanup
export function pruneOldRecords(olderThan: string): void; // Alte Records aufräumen
```

### 5.3 `ruleSync.svelte.ts` (Orchestrierung)

```typescript
// Kernfunktion: Führt Rules für einen Tag aus
export async function syncDay(
  date: string,
  options: {
    dryRun?: boolean; // true = nur Preview, keine Buchung
    autoOnly?: boolean; // true = nur autoSync-Rules
  }
): Promise<SyncPreview>;

interface SyncPreview {
  pending: SyncCandidate[]; // Neue Einträge zum Erstellen
  skipped: SkippedEntry[]; // Bereits synchronisiert
  staleRules: Rule[]; // Rules mit ungültiger Buchungsposition
  errors: SyncError[]; // Fehler bei Validierung
}

interface SyncCandidate {
  rule: Rule;
  sourceEntry: UnifiedTimeEntry;
  mocoPayload: MocoCreateActivity;
}

// Ausführung nach Preview-Bestätigung
export async function executeSyncCandidates(candidates: SyncCandidate[]): Promise<SyncResult>;
```

---

## 6. Description Templates

Für die Moco-Beschreibung unterstützen Rules Templates mit Platzhaltern:

### Jira-Variablen

| Variable           | Wert                            |
| ------------------ | ------------------------------- |
| `{issueKey}`       | z.B. `"SUP-123"`                |
| `{issueSummary}`   | z.B. `"Login broken on Safari"` |
| `{issueType}`      | z.B. `"Bug"`, `"Task"`          |
| `{projectKey}`     | z.B. `"SUP"`                    |
| `{worklogComment}` | Kommentar des Worklogs          |

### Outlook-Variablen

| Variable          | Wert         |
| ----------------- | ------------ |
| `{eventTitle}`    | Termin-Titel |
| `{eventLocation}` | Ort          |

**Default-Template Jira:** `"{issueKey} – {issueSummary}"`
**Default-Template Outlook:** `"{eventTitle}"`

---

## 7. UI-Konzept

### 7.1 Rules-Verwaltung (Modal)

Rules werden vollständig über ein Modal verwaltet — analog zum bestehenden `FavoriteModal`-Pattern. Kein eigener Settings-Screen.

**RulesModal** (Liste + CRUD):

- Öffenbar aus: Sidebar-Button, Settings, Day-View (Stale-Alert), Sync-Preview
- Liste aller Rules mit Status-Badge (aktiv/pausiert/stale)
- Pro Rule: Letzte Aktivität anzeigen (z.B. "Zuletzt: heute, 3 Einträge" oder "Zuletzt: vor 12 Tagen" oder "Noch nie ausgeführt"). Abgeleitet aus `syncRecordsState` via `ruleId`
- Inline-Toggle für `enabled` und `autoSync`
- Drag & Drop für Prioritätsreihenfolge
- Add/Edit/Delete Actions pro Rule

**RuleEditorModal** (Einzelne Rule bearbeiten):

- Öffnet sich über RulesModal oder direkt (z.B. Quick-Fix bei Stale-Target)
- Source-Typ wählen (Jira / Outlook)
- Source-Kriterien konfigurieren (Jira: Connection + Projekt-Key + optionaler Issue-Pattern)
- Moco Project + Task wählen (bestehender Combobox-Flow)
- Description-Template mit Variablen-Vorschau
- Auto-Sync Toggle
- Overlap-Warnung wenn überlappende Rule existiert

### 7.2 Day-View Integration — Transparenz-first

Leitprinzip: **Jede automatische Aktion muss nachvollziehbar sein, bevor sie passiert und nachdem sie passiert ist.**

#### Vor dem Sync: Pending-Indicator

- Jira-Worklogs, die eine Rule matchen aber noch nicht übertragen sind, zeigen inline die zugeordnete Moco-Position als Ghost/Preview (Projekt + Task, leicht ausgegraut)
- Kompakte Info-Leiste: "3 Worklogs bereit zur Übertragung" → Klick öffnet Preview mit Details

#### Während des Sync: Preview-Dialog (manueller Modus)

- Tabellarische Vorschau: Quell-Eintrag → Ziel-Position → Stunden → Beschreibung
- Einzeln abwählbar — User hat volle Kontrolle
- "Alle übertragen" oder einzeln bestätigen

#### Nach dem Sync: Feedback + Nachvollziehbarkeit

- Toast: "3 Einträge übertragen via Rules" (nicht nur eine Zahl, sondern klickbar zur Detail-Ansicht)
- Übertragene Moco-Einträge tragen ein dezentes Badge-Icon (z.B. `zap`) + Tooltip: "Übertragen via Rule '{name}'"
- Bei Auto-Sync: Gleicher Toast, damit der User sieht was automatisch passiert ist
- Bei Fehlern: Roter Toast mit konkretem Grund ("Moco-Task 'Support März' nicht mehr verfügbar")

#### Stale-Alerts

- "1 Rule hat eine ungültige Buchungsposition" → Klick öffnet direkt den RuleEditorModal mit vorausgewähltem Projekt

### 7.3 Stale-Target-Handling

Leitprinzip: **Stale = pausiert, nicht gelöscht.** Die Rule behält ihre Source-Konfiguration, nur das Target muss aktualisiert werden.

#### Erkennung

- Trigger: Jeder Projekt-Refresh (App-Start, manueller Refresh, 5-Min-TTL-Ablauf)
- `validateRuleTargets()` gleicht alle Rule-Targets gegen `mocoProjectsState.projects` ab
- Ergebnis: `targetStatus` → `stale` wenn Task-ID nicht mehr in aktiven Tasks des Projekts

#### Passive Hinweise (sichtbar, nicht blockierend)

- **Sidebar/Nav:** Orangener Warn-Badge am Rules-Icon mit Anzahl stale Rules
- **Rules-Modal:** Stale Rules mit gelbem Warn-Icon + "Task nicht mehr verfügbar", nach oben sortiert
- **Day-View:** Matchende Worklogs einer stale Rule zeigen Warnzustand statt normalem Ghost-Preview: "Rule 'Support' — Task nicht verfügbar"

#### Aktiver Hinweis (einmalig pro Erkennung)

- **Toast:** "Rule 'Support-Tickets' — Moco-Task 'Support März' ist nicht mehr verfügbar"
  - Action **"Jetzt aktualisieren"** → Öffnet RuleEditorModal, Task-Picker vorausgewählt auf dasselbe Projekt → im besten Fall ein Klick auf "Support April"
  - Action **"Später"** → Toast schließen, passive Badges bleiben
- **Dedup:** Flag `staleNotifiedAt` am Rule-Objekt — erst erneut toasten wenn sich der Status zwischenzeitlich geändert hat (z.B. User hat neue Task gesetzt, die auch wieder stale wird)

#### Blockierend (nur beim Sync)

- Stale Rules werden beim Sync übersprungen — Eintrag wird **nicht** übertragen
- In der Sync-Preview erscheint er als "blockiert" mit Grund: "Task 'Support März' nicht mehr verfügbar"
- Quick-Action direkt in der Preview: "Task aktualisieren" → öffnet RuleEditorModal mit vorausgewähltem Projekt

### 7.4 Sync Log

Einsehbare, chronologische Übersicht aller Sync-Aktivitäten — erreichbar als Tab im RulesModal.

#### Darstellung

- Chronologisch sortiert (neueste zuerst)
- Pro Eintrag: Datum, Quell-Eintrag (z.B. "SUP-123 – Login broken"), Ziel-Position (Projekt + Task), Stunden, Rule-Name, Modus (auto/manuell)
- Fehlgeschlagene Versuche werden ebenfalls angezeigt (rot markiert mit Grund: "Stale Target", "API-Fehler")
- Filterbar nach: Rule, Zeitraum, Source-Typ (Jira/Outlook), Status (erfolgreich/fehlgeschlagen)

#### Aktionen

- **Sync Record löschen:** Falls ein Moco-Eintrag manuell gelöscht wurde und der Worklog neu übertragen werden soll. Warnung: "Dadurch kann dieser Eintrag erneut übertragen werden"
- **Zum Moco-Eintrag springen:** Klick auf einen Record selektiert das Datum und hebt den zugehörigen Moco-Eintrag hervor

#### Datenquelle

Basiert auf `syncRecordsState.records` — keine zusätzliche Datenstruktur nötig. Fehlgeschlagene Versuche werden als eigener Record-Typ gespeichert:

```typescript
interface SyncRecord {
  // ... bestehende Felder ...
  status: 'success' | 'failed';
  errorReason?: string; // z.B. "stale_target", "api_error", "rate_limit"
}
```

### 7.5 Inline-Hilfe

Rules sollen selbsterklärend sein — keine separate Dokumentation, sondern kontextuelle Hilfe direkt in der UI.

#### Im RulesModal

- **Leerer Zustand:** Wenn noch keine Rules existieren, zeigt das Modal eine kurze Erklärung: "Rules übertragen Jira-Worklogs und Outlook-Termine automatisch nach Moco. Erstelle eine Rule, um ein Jira-Projekt oder einen wiederkehrenden Termin einer Moco-Buchungsposition zuzuordnen."
- **Info-Icon** neben der Überschrift mit Tooltip: Kurzerklärung des Konzepts

#### Im RuleEditorModal

- **Source-Sektion:** Kurzer Hilfetext unter dem Source-Typ-Picker: "Jira: Alle Worklogs eines Projekts übertragen" / "Outlook: Wiederkehrende Termine einer Position zuordnen"
- **Pattern-Feld (Outlook):** Platzhalter-Text: z.B. "Team Weekly" + Hilfetext: "Alle Termine deren Titel diesen Text enthält"
- **Description-Template:** Live-Vorschau mit Beispieldaten: `{issueKey} – {issueSummary}` → "SUP-123 – Login broken"
- **Auto-Sync Toggle:** Inline-Erklärung: "Wenn aktiviert, werden neue Einträge automatisch beim Öffnen des Tages übertragen"
- **Overlap-Warnung:** Kontextuell, nur wenn relevant

#### Im Sync Log

- **Leerer Zustand:** "Noch keine Übertragungen. Sobald Rules Einträge nach Moco übertragen, erscheinen sie hier."

---

## 8. Umsetzungsphasen

### Phase 1 — Foundation (MVP)

**Scope:** Rule CRUD + manueller Sync für Jira-Worklogs und Outlook-Events

1. Types definieren (`types/rules.ts`, `types/syncRecords.ts`)
2. `rules.svelte.ts` Store — CRUD, Persistence, `findMatchingRules()`
3. `syncRecords.svelte.ts` Store — CRUD, Dedup-Prüfung
4. `ruleSync.svelte.ts` — `syncDay()` mit dryRun, `executeSyncCandidates()`
5. RulesModal (Liste + CRUD) + RuleEditorModal (Einzelbearbeitung)
6. Source: Jira (Connection + Projekt-Key) und Outlook (Pattern + MatchType + overrideHours)
7. Day-View: "Apply Rules" Button mit Preview-Dialog
8. Entry-Badge für sync'd Entries
9. Bottom-up: "Rule erstellen" Action an Outlook-Events in der Timeline
10. Migration: Event-Favorites → Outlook-Rules konvertieren, `FavoriteEventMatch` entfernen
11. Sync Log als Tab im RulesModal (erfolgreiche + fehlgeschlagene Übertragungen)
12. Inline-Hilfe: Leere Zustände, Tooltips, Pattern-Hilfe, Template-Vorschau
13. VitePress-Dokumentation: `docs/guide/rules.md` + Sidebar-Eintrag + Features-Overview-Verweis

**Ergebnis:** User kann Jira- und Outlook-Rules anlegen und manuell per Klick übertragen. Event-Favorites sind durch Rules ersetzt.

### Phase 2 — Automation & Validation

**Scope:** Auto-Sync + Stale-Target-Management

1. Auto-Sync in `fetchDayEntries` integrieren
2. Target-Validierung bei App-Start und Projekt-Refresh
3. Stale-Target UI (Toasts, Badges, Quick-Fix)
4. Sync-Status-Leiste in Day-View
5. Description Templates mit Variablen-Ersetzung
6. Bottom-up: "Rule erstellen" Action an Jira-Worklogs in der Timeline (analog zu Outlook)

**Ergebnis:** Vollautomatische Übertragung mit Lifecycle-Management.

### Phase 3 — Erweiterungen

**Scope:** Bulk-Sync + Analytics

1. Bulk-Sync für Zeiträume (mit Preview)
2. Sync-History View (welche Einträge wurden wann übertragen)
3. Rule-Analytics: "Diese Rule hat im März 47 Einträge übertragen"
4. Change-Detection: Hinweis wenn Jira-Worklog-Stunden nachträglich geändert wurden

---

## 9. Entschiedene Fragen

| #   | Frage                          | Entscheidung                                                                                                                                                                                                                                                                            |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Geänderte Worklogs**         | Phase 1: Nur Neuanlage. Sync Record speichert `hours` — bei Abweichung wird ein Hinweis angezeigt ("Worklog SUP-123 wurde von 2h auf 3h geändert"), aber kein Auto-Update. Grund: User könnte Moco-Beschreibung zwischenzeitlich angepasst haben. Change-Detection als Phase-2-Feature. |
| 2   | **Multi-Rule-Konflikt**        | Warnung bereits bei Rule-Erstellung im Editor, wenn eine überlappende Rule existiert ("Überschneidung mit Rule 'Support-Tickets'"). Zur Laufzeit: Spezifischere Rule gewinnt (Issue-Key > Projekt-Key), bei gleicher Spezifität die höher priorisierte.                                 |
| 3   | **Auto-Sync Zeitraum**         | Nur für **heute**. Vergangene Tage ausschließlich über manuellen Trigger mit Preview. Bei ungebuchten vergangenen Tagen: Hinweis "3 ungebuchte Tage mit matchenden Worklogs", aber keine automatische Buchung.                                                                          |
| 4   | **Remote-Fields bei Moco**     | Ja — `remote_service: 'jira'` + `remote_id: issueKey` setzen. Vorteile: Klickbarer Jira-Link in Moco UI + zusätzlicher Dedup-Check über Moco-API. Manuell erstellte Einträge mit gleichem `remote_id` werden korrekt als "bereits gebucht" erkannt und übersprungen.                    |
| 5   | **Retention von Sync Records** | 6 Monate, danach automatisches Pruning bei App-Start via `pruneOldRecords()`. Kein Konfigurations-Overhead.                                                                                                                                                                             |

| 6 | **Rules pro Jira-Connection oder global?** | Pro Connection. `connectionId` ist Pflichtfeld in `JiraSourceMatcher`. Bei nur einer Connection wird das Feld im Editor automatisch befüllt. Verhindert Konflikte bei mehreren Jira-Instanzen mit gleichen Projekt-Keys. |
| 7 | **Description-Template in Moco überschreibbar?** | Ja — Moco-Beschreibung gehört dem User. Template wird nur bei Neuanlage angewendet. Nachträgliche manuelle Änderungen in Moco bleiben erhalten. Change-Detection (Phase 2) prüft nur Stunden, nicht Beschreibungen. |
| 8 | **Jira-Worklogs mit 0h übertragen?** | Nein — Worklogs mit 0h (reine Kommentare) werden ignoriert. Kein Konfigurations-Toggle nötig. Sie tauchen weder in der Sync-Preview auf noch werden sie automatisch übertragen. |

---

## 10. Technische Risiken

| Risiko                                        | Mitigation                                                         |
| --------------------------------------------- | ------------------------------------------------------------------ |
| **Doppelbuchung bei Race Condition**          | Sync Records vor und nach Moco-API-Call prüfen, optimistic locking |
| **Moco API Rate Limits bei Bulk-Sync**        | Sequential mit Delay, max 10 Einträge pro Batch                    |
| **Stale denormalisierte Projekt-/Task-Namen** | Bei Projekt-Refresh auch Rule-Targets aktualisieren                |
| **Sync Records wachsen unbegrenzt**           | Automatisches Pruning nach 6 Monaten bei App-Start                 |
| **Offline-Szenario**                          | Rules nur ausführen wenn alle beteiligten Services erreichbar sind |
