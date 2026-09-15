# Kaizen for iOS — Product & Engineering Specification

**Status:** Ready to build.
**Source of truth:** the Kaizen web app at the time this doc was written (backend `apps/backend`, frontend `apps/frontend`, commit `f2901da` on `main`).
**Audience:** an engineer (or agent) with no prior context on this project, building a native iOS app from scratch in Swift/SwiftUI.

This document specifies *what* Kaizen is, *exactly* how its logic behaves today, and how to translate it to a native iOS app without losing what makes it feel like Kaizen. Where the web app's behavior is precise (money math, date math, theming), this doc gives you the exact rule or algorithm, not a paraphrase — implement it as written, because the reward/cut ledger is real money-shaped state and subtle date-boundary bugs will misfire it.

---

## 0. What Kaizen is, in one paragraph

Kaizen is a personal habit-tracking app built around a real incentive loop: the user defines **Measures** (things they track — Workout minutes, Water intake, Reading pages), attaches **Goals** to a measure (a target for a day or a week), and each Goal can pay a **reward** into the user's balance when the target is hit and/or take a **cut** out of the balance when a period closes without the target being met. The balance is real, user-facing, and cash-out-able (a "Quick Cashout" and a manual transaction ledger). Progress is visualized as a GitHub-contribution-style heat grid on mobile and a calendar/week-line-chart view on desktop. The whole UI is skinned by a **theme system**: two visually and typographically distinct families (a soft rounded "Growth" look and an ink-brush "Sumi" look), each with light and dark modes, so the same data can look completely different depending on user preference — and this theming, tone, and feel is the single most important thing to preserve in the port. This is not a generic tracker; it is a small, opinionated, good-looking app about the practice of showing up, and it must not read as a stock SwiftUI form-based app when it's done.

---

## 1. Non-negotiables (read this before writing any Swift)

1. **The reward/cut ledger math must be bit-for-bit faithful.** Section 3 gives you the exact algorithms (goal evaluation, cut settlement, streaks, daily progress). These are money-shaped: a reward or cut is a real balance change with an idempotency key. Re-implement the *rules*, not just the *shape* of the feature.
2. **Three font roles per theme, never more.** `display` (page headings), `ui` (everything else — menus, card titles, measure/goal names, buttons, the cash-flow chart), `meta` (small uppercase eyebrow labels and numeric figures/balances). This was a deliberate, hard-won reduction from eight competing typefaces down to three. Do not let the iOS build regrow extra faces (e.g. don't let SF Pro leak in as a fourth face for "convenience" — pick real font assets for `ui` and `meta` per theme and use them everywhere text appears, falling back to system fonts only where Apple requires it, like the system keyboard).
3. **Two theme families, two modes each, four total looks.** "Growth" (soft, rounded, green-accented, serif display) and "Sumi" (ink-and-paper, red-accented, brush display, near-square corners, visible paper texture in light mode). Each has light and dark. See Section 4 for exact tokens. The Sumi family's textured paper background and brush marks are signature — they must render as genuine on-screen texture, not a flat tint standing in for "the dark theme with different colors."
4. **Cuts never retroactively charge.** A cut only settles calendar periods that start on or after the moment the user turned it on. This is a trust guarantee stated in the product's own UI copy; violating it is a correctness bug, not a style nit.
5. **Everything the web app can do, the iOS app must be able to do**, per the parity checklist in Section 9 — including CSV export and personal API tokens, even though those look like "backend admin" features. A user who has been using the web/self-hosted version expects to find the same controls.
6. **Local-first, with iCloud as the default "no server" sync, and an explicit, optional connection to a self-hosted Kaizen server.** These are two different storage modes the user picks between, not one hybrid system — see Section 7.1. Don't build a three-way merge between on-device, iCloud, and a REST backend; that is unnecessary complexity for a personal habit tracker and a correctness minefield for money-shaped data.
7. **HealthKit integration is opt-in, per-measure, and additive.** A Measure can optionally be *linked* to a HealthKit sample type. Linking never changes Kaizen's own reward/cut math — Health is a data source (and optionally a destination) for entries, not a replacement for Kaizen's own storage. See Section 8.

---

## 2. Domain model

This is the canonical shape of the data. Field names are given in a language-neutral way; adapt naming to Swift conventions (e.g. `camelCase` properties, `UUID` ids) but keep the semantics exact.

### 2.1 User
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `email` | String | Unique. Used for login when a remote server is configured; optional/unused in local-only mode. |
| `name` | String? | Display name. |
| `passwordHash` | — | Server-side only; never stored or transmitted in cleartext. iOS never sees this. |
| `balance` | Decimal | The reward economy balance. **Must be a decimal/fixed-point type, not Double**, to avoid floating-point drift over hundreds of small reward/cut transactions. The existing backend uses a float and this is a known weakness — do not carry it forward on iOS; use `Decimal`. |
| `weekStartsOn` | enum `sunday` \| `monday` | Governs weekly goal period boundaries and the calendar/week-view start day. |
| `theme` | struct `{ family: growth \| sumi, mode: dark \| light \| system }` | See Section 4. Stored as one encoded value (the web app encodes it as a single string `"family:mode"`, e.g. `"sumi:light"` — keep that shape if syncing this field to a remote server, so an existing account's theme round-trips correctly). |
| `createdAt` | Date | |

### 2.2 Measure
A trackable thing. Example: "Workout" (unit: minutes), "Water" (unit: fl oz).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name` | String | |
| `unit` | String | Free text, e.g. "minutes", "fl oz", "pages". Displayed next to values. |
| `type` | enum `number` \| `time` | `time` values are stored as **minutes-since-midnight** (an integer) and rendered as `H:MM AM/PM` or `H:MM` duration depending on context — see 2.2.1. `number` values are plain decimals. |
| `icon` | String | Icon identifier. Web app uses a fixed palette of 32 Lucide icon names (Target, Zap, Heart, Book, DollarSign, Dumbbell, Droplets, Flame, Smile, Star, Trophy, Clock, Briefcase, Coffee, Music, Sun, Moon, Brain, Mountain, Footprints, BedDouble, Utensils, Bike, Wallet, Users, Smartphone, Code, Gamepad2, Plane, Home, Leaf, Palette). Map each to the closest SF Symbol (e.g. Dumbbell → `dumbbell.fill`, Droplets → `drop.fill`, Flame → `flame.fill`) — do not just show emoji or a text label; icon-forward measure identity is part of the product's visual language.
| `color` | String | One of a fixed 14-name palette (see 2.2.2). **This palette is deliberately NOT themed** — a measure's color reads the same in Growth or Sumi, light or dark, because it's the user's own data-identity color, not a theme accent. Keep this rule.
| `goals` | [Goal] | One measure can have multiple goals (e.g. a DAILY goal and a WEEKLY goal on the same measure). |
| `createdAt` / `updatedAt` | Date | |

**2.2.1 TIME semantics.** A `time` measure's raw value is minutes since midnight (0–1439). Two independent things depend on `operator` (see Goal below), and both matter for the UI: when the operator is "at least" (`GTE` — did I do it *after* this time, e.g. "in bed after 10pm" doesn't make sense, but "workout starts after 6am" does) render as clock time `H:MM AM/PM`; when the underlying entry is being summed as a duration in a table (e.g. total minutes logged this week) render as `H:MM` (hours:minutes, no AM/PM). Both the goal *target* and any individual *entry value* for a TIME measure follow this same encoding.

**2.2.2 Color palette (exact, do not add/remove/reorder without reason):**
`emerald #10b981`, `blue #3b82f6`, `purple #a855f7`, `rose #f43f5e`, `amber #f59e0b`, `cyan #06b6d4`, `indigo #6366f1`, `pink #ec4899`, `lime #84cc16`, `teal #14b8a6`, `orange #f97316`, `sky #0ea5e9`, `violet #8b5cf6`, `fuchsia #d946ef`. Each color needs a solid fill, a ~10%-opacity soft background, and a ~20%-opacity border tint for card chrome — reproduce as SwiftUI `Color` + `.opacity()` rather than hand-picking new tints per state.

### 2.3 Goal
A target attached to a measure. **A goal is the single record that drives both the reward and the cut** — it is not two separate rule types. Reading the UI: "Rewards" and "Cuts" are two *views* filtering the same goal list (`rewardAmount > 0` / `cutAmount > 0`); a goal can have a reward only, a cut only, or both.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `measureId` | UUID | |
| `timeframe` | enum `daily` \| `weekly` | **Only these two are implemented.** (The web app's TypeScript type also allows a `monthly` literal that was never wired up in the evaluation engine — do not port that dangling option; either implement monthly properly end-to-end per Section 3, or omit it. Don't reproduce a half-wired enum case.) |
| `type` | enum `total` \| `count` | `total`: sum the value of every entry in the period. `count`: count how many entries in the period qualify (see `minPerEntry`). |
| `targetValue` | Decimal | The number to compare against. For a `time` measure this is minutes-since-midnight (or a duration in minutes, depending on `operator`/context — same rule as 2.2.1). |
| `operator` | enum `gte` \| `lte` | `gte` = "at least" (the common case: hit or exceed the target to succeed). `lte` = "at most" (e.g. "screen time under 60 minutes", or "in bed before 10:30pm" for a TIME measure). |
| `minPerEntry` | Decimal? | Only meaningful when `type = count`. An individual entry only counts toward the tally if its value is `>= minPerEntry` (this threshold is a "qualifies at all" floor, not affected by `operator`). |
| `rewardAmount` | Decimal | Paid into balance the moment the *current, in-progress* period's tally meets the target (see 3.1 — this fires eagerly on entry create/update, not lazily). `0` means no reward. |
| `cutAmount` | Decimal | Charged against balance once a period **closes** with the target unmet (see 3.2 — this is evaluated lazily on read, never eagerly, because you cannot know a period was missed until it's over). `0` means no cut. |
| `cutStartsAt` | Date? | The moment the cut was switched on (`cutAmount` went from `0`/off to `>0`). **Null/absent whenever `cutAmount` is `0`.** This is the anchor for the "never retroactive" rule — periods that started before this timestamp are never charged, even if they were missed. Turning a cut off and back on later re-stamps this to "now", so the gap in between is never billed. |
| `createdAt` / `updatedAt` | Date | |

### 2.4 Entry
A single logged data point for a measure on a specific calendar date.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `measureId` | UUID | |
| `value` | Decimal | Same TIME encoding rule as above when the parent measure is `time`. |
| `date` | Date (**date-only**, no time-of-day) | **Critical:** this must be treated as a calendar date, never a timestamp with an ambiguous timezone. The web backend explicitly parses `"YYYY-MM-DD"` strings as UTC midnight specifically so that no client timezone can shift an entry (or the reward/cut period it belongs to) onto an adjacent calendar day. On iOS, store this as a timezone-naive calendar date (`DateComponents(year:month:day:)` or a dedicated "civil date" wrapper), never as a plain `Date` derived from `Date()` with implicit local timezone math. Multiple entries can exist for the same measure on the same date (e.g. three separate water logs in one day) — they sum (or count) together for goal evaluation. |
| `createdAt` | Date (real timestamp) | When the entry was actually recorded, distinct from the calendar `date` it's logged against (a user can back-log an entry for yesterday). |

### 2.5 Transaction
An immutable-ish ledger row. Balance is a derived/cached total; transactions are the source of truth for history and for cut/reward idempotency.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `amount` | Decimal | Signed. Positive for rewards/credits, negative for cuts/debits/cashouts. |
| `type` | enum `reward` \| `cut` \| `cashout` \| `manualCredit` \| `manualDebit` | (The web app's type union also lists `bonus`, `credit`, `debit` as legacy/reserved values that are never actually produced by current server logic — `manualCredit`/`manualDebit` are what a user-entered "New Transaction" actually becomes. Don't manufacture new transactions with the unused legacy types.) |
| `title` | String | Short label, e.g. "Goal Met", "Missed target", "Cashout", or a user-typed title for manual entries. |
| `notes` | String? | Free text, or an auto-generated description like `"Workout (DAILY TOTAL)"`. |
| `goalId` | UUID? | Present for `reward`/`cut` rows — links back to the goal that produced it. |
| `periodId` | String? | **The idempotency key.** For a daily period: the ISO date of that day, e.g. `"2026-09-15"`. For a weekly period: `"WEEK-" + ISO date of the period's start-of-week`, e.g. `"WEEK-2026-09-14"`. A given `(goalId, periodId)` pair may produce **at most one** transaction, ever — this is what stops a goal from being rewarded twice for the same day, and (crucially) what stops a period from being *both* rewarded and cut: check for an existing transaction with that exact `(goalId, periodId)` before writing either one. |
| `createdAt` | Date | For a reward/cut, this is set to the moment the *period* closed (or, for a same-day reward, the entry's calendar date), not the wall-clock moment the server happened to compute it — so the cash-flow chart buckets a reward/cut into the month it was actually earned/missed, not the month the app happened to be reopened. |

### 2.6 API Token
Long-lived credential for scripting/automation against a self-hosted server (e.g. a Shortcuts action, a cron job posting entries via `curl`). Only relevant in "connect to a self-hosted server" mode (Section 7.1c) — irrelevant when running fully local/iCloud.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name` | String | User-chosen label, e.g. "Curl Script". |
| `rawToken` | String | Format `"kaizen_" + 64 hex chars`. **Shown to the user exactly once, at creation** — the server stores only a SHA-256 hash and cannot show it again. iOS must copy this to the clipboard / offer a share sheet at creation time and never assume it can be recalled later. |
| `lastUsedAt` | Date? | |
| `createdAt` | Date | |

---

## 3. Core algorithms — implement exactly

### 3.1 Reward evaluation (eager, runs on every entry create/update)

Whenever an entry is created or edited, for **every goal on that entry's measure**:

1. Determine the goal's **current period** containing the entry's `date`:
   - `daily`: the single calendar day.
   - `weekly`: the 7-day window from the user's configured week-start day through 6 days later, containing the entry's date.
2. Compute `periodId` (see 2.5's format).
3. Gather **all entries** for that measure whose `date` falls within the period.
4. Compute the tally:
   - `type = total`: sum of `value` across those entries.
   - `type = count`: count of entries where `!minPerEntry || value >= minPerEntry`.
5. Check whether the goal is met: `operator = gte` → `tally >= targetValue`; `operator = lte` → `tally <= targetValue`.
6. If met **and** `rewardAmount > 0` **and** no transaction already exists with `(goalId, periodId)`: create a `reward` transaction for `+rewardAmount`, increment balance, record `goalId`/`periodId`, set `title = "Goal Met"`, `notes = "{measure name} ({timeframe} {type})"`, `createdAt` = the entry's date (start-of-day).
7. This repeats for every goal on the measure — a measure can have both a DAILY and a WEEKLY goal simultaneously, both independently evaluated on the same entry write.

This is **eager and can pay out mid-period** — the moment a running daily/weekly tally crosses the target, the reward fires, even if the day/week isn't over. (Cuts, below, are the opposite: they cannot fire until the period is fully over.)

### 3.2 Cut settlement (lazy, runs whenever balance/history is read)

Because you cannot know a period was "missed" until it has fully elapsed, cuts are **not** evaluated on entry write. Instead, run this settlement pass every time the app is about to display balance or transaction history (on iOS: run it right after the app becomes active / on pull-to-refresh / before rendering the Money/Transactions screen — cheap idempotent no-op when there's nothing to settle):

```
MAX_SETTLE_DAYS = 90   // never reach back further than this on a cold start

for each goal where cutAmount > 0:
    beginDate = max(goal.cutStartsAt, today - MAX_SETTLE_DAYS)   // the earlier of "when the cut was turned on" and the 90-day floor, clamped up to the floor
    today0 = startOfDay(now)

    if goal.timeframe == daily:
        for each day D from beginDate up to (but excluding) today0:
            tally = sum/count of entries for goal.measureId on day D, per goal.type/minPerEntry rule
            if NOT (tally satisfies goal.operator against goal.targetValue):
                periodId = ISO date of D
                if no transaction exists with (goal.id, periodId):
                    create a `cut` transaction for -cutAmount, decrement balance,
                    title = "Missed target", notes = "{measure} ({timeframe} {type})",
                    createdAt = D + 1 day (i.e. the moment the day closed)

    if goal.timeframe == weekly:
        weekStart = startOfWeek(beginDate, user.weekStartsOn)
        if weekStart < beginDate: weekStart += 7 days   // a week already in progress when the cut was switched on is never charged
        while weekStart + 7 days <= today0:
            tally = sum/count of entries for goal.measureId within [weekStart, weekStart+7d), per goal.type/minPerEntry rule
            if NOT (tally satisfies goal.operator against goal.targetValue):
                periodId = "WEEK-" + ISO date of weekStart
                if no transaction exists with (goal.id, periodId):
                    create a `cut` transaction for -cutAmount, decrement balance,
                    title = "Missed target", notes = "{measure} ({timeframe} {type})",
                    createdAt = weekStart + 7 days
            weekStart += 7 days
```

Key properties to preserve (each is a deliberate correctness/trust decision, not an accident):
- **The in-progress period (today, or this week) is never evaluated.** Only fully-closed periods.
- **`(goalId, periodId)` uniqueness is shared between reward and cut.** If a period already produced a reward transaction (because the target was hit before the period closed), the settlement pass's existence check will see that row and skip charging a cut for the same period — a period is never both rewarded and cut.
- **Never retroactive past `cutStartsAt`.** Turning a cut on today only starts billing from today's (or this week's) close onward.
- **90-day ceiling.** A dormant app doesn't produce a shocking wall of back-charges when reopened after months away.
- This pass is naturally idempotent — running it twice in a row produces zero additional transactions the second time, so it's safe to run opportunistically and often rather than needing a precise scheduler.

### 3.3 Daily progress (for rendering — heat grid cells, calendar cells, today's ring)

For a given measure and a given day:
```
dailyGoal = the measure's DAILY goal, if any (for rendering purposes; WEEKLY goals don't drive a single day's cell)
target = dailyGoal?.targetValue ?? 0
tally = sum (type=total) or qualifying-count (type=count) of that day's entries, per the goal's own type/minPerEntry
progress% = target > 0 ? min(100, tally / target * 100) : 0
met = target > 0 && tally satisfies operator
```
The mobile heat-grid cell shading (Section 5.1) buckets `progress%` into 5 discrete levels: `0` → empty/no color, `>0` but target unmet and `<33%` → level 1, `33–65%` → level 2, `66–99%` → level 3, `100%+` or "met with no numeric target" (e.g. a plain logged value with no goal at all) → level 4 (full/solid). If the measure/day has **no** DAILY goal at all but does have a logged value, treat it as level 4 (solid) rather than 0% — presence of any data should read as "something happened," not "nothing happened."

### 3.4 Streak (current consecutive-day streak against a measure's DAILY goal)

Only defined when a measure has a DAILY goal (no daily goal → streak is always 0, even if a weekly goal exists). Walk backward from today:
- If today's tally already meets the goal, count today, then continue checking yesterday, the day before, etc., incrementing for each additional day that also met the goal, until a day fails.
- If today has **not yet** met the goal, don't immediately count it as broken — check yesterday instead. If yesterday met the goal, the streak is still "alive" (today just hasn't happened yet) and you count backward from yesterday. If yesterday also failed, the streak is 0.
- Cap the backward walk at 3650 days as a safety bound.

### 3.5 Week-key / period-start math
Given a date and a `weekStartsOn` (`sunday` or `monday`), the start-of-week is the most recent occurrence of that weekday on/before the given date, at local midnight. All weekly goal/cut logic in 3.1–3.2 depends on this being computed identically everywhere it's used (evaluation, settlement, and the calendar/heat-grid UI) — implement it once as a shared utility, not re-derived per call site.

---

## 4. Theming system (the heart of the product — read carefully)

Two independent axes: **family** (`growth` | `sumi`) and **mode** (`dark` | `light`, with a `system`-follows-OS option that resolves to one of those two). Four total rendered looks. The user picks family + mode in Settings; the choice is stored on the user record (and should sync via whichever storage mode is active — Section 7.1) so it follows them across their own devices/reinstalls, in addition to being cached locally for instant, flash-free launch.

**Design principle:** every color, radius, and font in the entire app is expressed as a *semantic token* (e.g. "accent", "hairline", "ink-high-emphasis", "positive-money", "negative-money", "surface", "font-display") — never a raw hex or a raw font name inlined at a call site. A theme is fully defined by supplying values for these tokens. On iOS, implement this as a small `Theme` protocol/struct (colors, fonts, corner radii, and a "texture" flag) resolved once per family+mode pair and injected via SwiftUI `Environment`, mirroring the web app's CSS-custom-property approach. **Do not** hand-pick per-screen colors "close enough" to the token value — reference the token.

### 4.1 Semantic tokens and their values, per theme

**Surface / structure tokens** (used for card backgrounds, borders, dividers, wells):
- `surface` — the translucent card/panel background color+opacity.
- `hairline` — border/divider color+opacity (drawn at low opacity over the background, so it reads as a hairline, not a hard rule).
- `raise` — the "lighter than background" overlay used for subtle hover/pressed states and secondary buttons (this is literally white in dark modes and near-black in light modes — it's an *overlay direction* token, not a fixed color).
- `sunken` — the "recessed well" color used for input fields and inset panels (a true black well in dark modes, a warm mid-gray well in light modes).
- `ink-high` / `ink-mid` / `ink-low` / `ink-faint` — the four-step text-emphasis ramp (primary text, secondary text, tertiary/label text, disabled/placeholder text).
- `accent` / `accent-strong` / `accent-ink` — the theme's call-to-action color, a stronger variant for active/pressed states, and the color to use *for text/icons drawn on top of a solid accent-colored surface* (i.e. accent-ink is whatever contrasts against accent — it is white in Sumi, and also white in Growth-light but near-black in Growth-dark; don't assume it's always white or always black).
- `positive` / `negative` — the color for money-in vs money-out (rewards/earned vs cuts/spent), which is a distinct concept from `accent` and must not be conflated with it (e.g. in Sumi, accent and negative are both reddish but are separately tunable).

**Exact values — Growth, dark (default):**
- Background: solid `#111513` with three soft radial/linear gradient washes layered over it (a faint green glow upper-left, a faint amber glow upper-right, a subtle diagonal darken toward the bottom corners) — not a flat single color.
- Surface: `rgb(31,38,34)` at ~78% opacity, 1px hairline border `rgb(220,235,208)` at ~9% opacity, soft drop shadow.
- Ink: high `#edf3e7`, mid `#a8b3a6`, low `#7c877b`, faint `#5a635a`.
- Accent: `#b7d58d` (a soft sage green), strong `#c9e6a1`, ink-on-accent `#172014` (near-black — Growth-dark's accent is light, so text on it is dark).
- Positive `#34d399` (emerald), Negative `#f87171` (soft red).
- Corner radii: generous and rounded — roughly 8px / 12px / 12px / 16px / 24px for an ascending small→large radius scale (matches Tailwind's `rounded-md/lg/xl/2xl/3xl` as used in the source).
- No paper texture.

**Exact values — Growth, light:**
- Background: `#f3f6ee` base with the same three-gradient-wash structure, lightened/brightened.
- Surface: solid white-ish `rgb(255,255,255)` at ~82% opacity, hairline now a *dark* green-black `rgb(44,62,36)` at ~9% (borders get darker, not lighter, in light mode — don't just invert to a fixed gray).
- Ink: high `#1b2418`, mid `#4a5646`, low `#6d7a68`, faint `#929d8d`.
- Accent: `#5f8f36` (a deeper, more saturated green than the dark mode's pastel — light mode accents need more chroma to read against a bright ground), strong `#4d7a28`, ink-on-accent `#ffffff`.
- Positive `#15803d`, Negative `#be183c` (deeper/more saturated than dark mode's positive/negative for the same contrast reason).
- Same rounded radii as Growth-dark.

**Exact values — Sumi, dark (ink ground):**
- Background: near-black `#0b0b0a` with a single faint vermilion glow upper-left and a diagonal darken gradient — moodier and more monochrome than Growth's multi-color wash.
- Surface: `rgb(23,23,22)` at ~86% opacity, hairline is bone-white `rgb(246,243,236)` at ~9%.
- Ink: high `#f6f3ec` (warm bone-white, not pure white), mid `#b3aea4`, low `#86817a`, faint `#5d5a55`.
- Accent: `#d11f34` (vermilion red), strong `#ee2a40`, ink-on-accent `#fffaf7` (near-white).
- Positive: bone-white `#f6f3ec` (in this theme, "earned" reads as ink/light rather than green — deliberately monochrome-plus-red), Negative `#d11f34` (the same vermilion as the accent — in Sumi, "spent" and "the accent color" are visually unified, unlike Growth where they're separate hues).
- Corner radii: near-square — roughly 1px / 2px / 2px / 3px / 4px. This is a deliberate, dramatic departure from Growth's rounded scale; Sumi cards should read as rectangular with just enough curve to not be razor-sharp.
- Texture: a faint fine-grain fiber texture (see 4.2) blended in `overlay` mode at low opacity — lifts rather than darkens, so it's subtle on a dark ground.

**Exact values — Sumi, light (washi paper):**
- Background: near-white `#fdfdfb` with soft, irregular warm-gray radial washes (not a symmetric gradient — meant to read as light pooling unevenly across paper) plus a subtle diagonal gradient.
- Surface: near-white `rgb(255,255,254)` at ~74% opacity, hairline near-black `rgb(30,26,20)` at low opacity.
- Ink: high `#14110d` (near-black, warm), mid `#45403a`, low `#736c62`, faint `#9c948a`.
- Accent: `#bd1526`, strong `#9d0f1e`, ink-on-accent `#fffaf7`.
- Positive: near-black `#14110d` (again, monochrome-plus-red logic — "earned" is ink-colored, not green), Negative `#bd1526`.
- Same near-square radii as Sumi-dark.
- **Texture: this is the signature visual element of the whole theme system and must render as genuine visible texture, not a metaphorical "paper-ish" tint.** It is composited from four layered generative marks, all multiplied onto the near-white background at a combined strength around 80-85% opacity:
  1. A fine, dense, high-frequency grain (paper fiber) — subtle, everywhere.
  2. A very low-frequency soft gray "wash" — large, irregular, softly-edged pools of slightly darker tone, as if ink had bled unevenly into the paper at a few points (concentrated near the top-left, right-of-center, and bottom, per the web app's exact gradient anchors, though the important thing is "a few soft irregular pools," not a uniform vignette).
  3. Sparse, small, hard-edged dark specks — dirt/grit, visibly darker than the wash, randomly scattered.
  4. Hand-placed ink "spatter" — several dozen small irregular dark ellipses at varied size, rotation, and opacity, plus a handful of longer thin streaks — meant to read as flicked ink droplets, not perfect circles. (The web implementation generates these as inline SVG filters/shapes; on iOS the equivalent is a `Canvas`-drawn or pre-rendered tiled texture image using the same recipe: don't substitute a single stock "paper" photo texture, because it won't carry the specific dark-speck/spatter character that reads as ink-on-paper rather than "old photograph.")
  This texture sits behind all content, tiled/repeating, drawn once and composited via a blend mode (`multiply` in light mode so it darkens the paper; `overlay` in Sumi-dark so it lifts rather than darkens). Get this right — it was iterated on multiple times in the web app specifically because a flat or too-subtle texture reads as "just a beige background," which defeats the entire point of the Sumi theme.

### 4.2 Typography — exactly three roles, per theme

| Role | Used for | Growth | Sumi |
|---|---|---|---|
| `display` | Page headings only (e.g. "Keep the promise.", "Make progress tangible.") | A warm high-contrast serif (web app uses **Fraunces**) at weight 600, slightly negative letter-spacing (~ -0.04em) | A genuine ink-brush display face — bold, dry-brush texture, upright (not italic/slanted — an italic script reads as a signature font, not calligraphy, and was explicitly rejected during design). The web app uses a font called **Mister Brush** (SIL Open Font License, self-hosted, includes a licence file that must ship alongside it) for this role, sized down slightly relative to the serif because brush faces read larger than serifs at the same nominal size. |
| `ui` | Everything else: nav labels, card titles, measure and goal names, buttons, section headers, the cash-flow chart's own text, table/list content | A clean, modern humanist sans (web app uses **DM Sans**) | A Japanese mincho serif (web app uses **Shippori Mincho**) — this is what gives Sumi's *body* text an ink-and-paper character rather than just its headlines; a generic geometric sans here was explicitly identified as a mistake and replaced. **Do not let Sumi's `ui` role default to a plain system sans** — that was the exact problem this theme's typography was built to fix. |
| `meta` | Small uppercase eyebrow labels above headings, and numeric figures (balances, dates, stat values, chart axis labels) | A monospace face (web app uses **DM Mono**) | Same monospace face as Growth — this role is intentionally the *one* thing that does not change between families, since tabular figures benefit from a consistent, highly legible monospace regardless of theme. |

Additional typography rules:
- Money and other tabular figures should use tabular/monospaced figure rendering wherever they appear (balance chip, stat tiles, chart axes) so digits align in a column — this is a `meta`-role responsibility.
- Eyebrow labels (small uppercase text above a heading, e.g. "YOUR REWARD LOOP") use wide letter-spacing (~0.24–0.34em depending on theme) and the `meta` face, not the `ui` face — they are visually a caption/kicker, not a menu item, even though both are small text.
- License obligations: if you self-host a brush/display font under the SIL Open Font License (as the web app does), the license file must be bundled with the app and its terms honored (embedding is permitted under OFL; redistribution of the font file alone is not). Do not source a display "brush font" from an unlicensed or ambiguously-licensed origin — verify licensing before bundling any third-party font binary, exactly as was done for the web app's font choice.

### 4.3 Iconography and motion
- Icons: Lucide icon names (measure icons, nav icons, UI glyphs) map to SF Symbols — build a lookup table once, don't invent new icon choices per screen.
- Corner radius is a theme token (Section 4.1's radii), not a fixed constant — every `RoundedRectangle`/card/button in the app should read its corner radius from the active theme, so switching from Growth to Sumi visibly and immediately squares off every card on screen.
- Brush "furniture" (Sumi only): a short tapered ink-stroke underline beneath page headings, and a similar dry-brush horizontal rule used as a divider instead of a hard line — both should render as *nothing* (not a fallback straight line) in the Growth family; they are Sumi-specific accents, implemented as filled tapered shapes (thin at the ends, heavy in the middle, with a few dry "flecks" trailing off), not simple stroked lines.
- An "enso" (a hand-drawn circle deliberately left open at one point, drawn as one sweep that thins as the brush lifts) appears as a very low-opacity decorative watermark behind the main dashboard heading in Sumi — subtle, not a focal graphic.

### 4.4 Theme switching mechanics
- Switching family or mode should apply **instantly** across the whole UI with no navigation/reload required, and should persist immediately (local cache first for instant re-launch, then sync to whichever storage backend is active).
- `system` mode should live-follow OS appearance changes while the app is foregrounded.
- App icon: iOS does not allow generating a launcher icon per-theme the way a PWA manifest can be swapped at will (that was a web-specific mechanism using a canvas-drawn manifest icon that only affects *future* installs). Provide the two family looks as **alternate app icons** (`UIApplication.setAlternateIconName`) so a user who prefers Sumi can switch their Home Screen icon to match from within Settings, understanding this is a manual "alternate icon" pick rather than something that silently updates unprompted (iOS requires user-visible confirmation to change the home screen icon, and that's an acceptable, expected native pattern — don't fight it).

---

## 5. Screens and behavior

Design each screen against the theme tokens in Section 4, not fixed colors. General layout notes: the product is mobile-first; the phone experience below is the primary target, but a compact/regular width (iPad, or an iPhone in a larger Dynamic Type / multitasking context) should reflow toward the "desktop" description given for Dashboard/Transactions where noted, using SwiftUI's size-class adaptation rather than a hand-rolled breakpoint system.

### 5.1 Dashboard (Home)
**Phone layout — the signature view of the app:** a single card containing one **contribution-heat-grid row per measure** for the current 7-day week (Sun–Sat or Mon–Sun per `weekStartsOn`). A shared day-of-week header (single letter + date number) runs across the top, columns aligned to the rows below. Each row: the measure's icon + name + week-total on the left in a fixed-width gutter, then seven square cells to the right, one per day. Each cell:
- Is colored using the *measure's own color* (Section 2.2.2) at one of 5 opacity/shade levels per Section 3.3's `progress%` bucketing — darker/more saturated the closer to (or past) 100% of target.
- Shows the day's raw logged value as small centered text inside the cell if any value was logged that day (formatted compactly — integers with no decimal, else one decimal place; TIME values as `H:MM`), otherwise empty.
- Today's cell gets a visible inset ring/border in the accent color.
- Is tappable — tapping any cell opens a day-editor sheet listing every measure's entries for that date, editable inline, with a save action.
- A week-forward/back control and a "week / month" toggle sit above the grid; month mode swaps to a small calendar grid (weekday header + full month, current-month cells highlighted, entries per day shown as compact colored tags/dots) also tappable per-day into the same day editor.

**Wider layout (iPad / regular width):** replace the stacked heat-grid card with a richer week board: a left "info" column per measure (icon, name, week total) next to a full-width mini line-chart per measure showing daily values against a dashed reference line at the goal target, with a hover/press state that surfaces a same-day comparison across all measures. A month-calendar alternate view mirrors the phone's month mode but larger, with a persistent side list of measures (icon, streak, quick stats) alongside the calendar.

### 5.2 Log Entries
A week-scoped log view: a running list of the current week's entries grouped by day, each with a quick add/edit affordance per measure (a big obvious "log a value" control per measure — this should feel like the single fastest path in the whole app to record something, since that's the core loop). Includes a compact month calendar for jumping to a different week, and a per-day/per-measure quick-entry modal that accepts numeric or time input depending on measure type.

### 5.3 Measures ("What are you growing?")
A management list of all measures: icon, name, unit, color swatch, edit and delete actions. A prominent create action opens a form: name, unit, type (number/time), icon picker (grid of the 32 mapped SF Symbols), color picker (the 14-swatch palette). Deleting a measure should warn that it cascades — removing all of its goals and logged entries (mirror the backend's cascade-delete behavior).

### 5.4 Goals — "Rewards" and "Cuts" (two tabs, one dataset)
A segmented control at the top switches between a **Rewards** view (goals filtered to `rewardAmount > 0`) and a **Cuts** view (goals filtered to `cutAmount > 0`). Each row shows: measure icon/name, a plain-language description of the target (e.g. "DAILY · at least 30 minutes", using `operator`-appropriate wording — "at least"/"at most" for number measures, "before"/"after" for time measures), and the dollar amount with a clear sign (green/positive-styled `+$5.00` in Rewards, negative-styled `-$2.00` in Cuts). Tapping a row edits it; a create/edit form lets the user set measure, timeframe, tracking type, operator, target value, reward amount, and cut amount **in one combined form** (both amounts editable together — a goal is one record with two optional payouts, not two separate creation flows). When a nonzero cut amount is entered, show explanatory copy that cuts only apply going forward from the moment this is saved (reinforcing the 3.2 guarantee). The Cuts tab additionally surfaces a short list of "targets without a cut yet" (existing reward-only goals) with a one-tap "add a cut to this" affordance, since adding stakes to an existing goal is a common follow-up action.

### 5.5 Transactions / Money
Balance-first: a compact three-up stat strip (Balance, Total Earned, Total Spent) sits above a **cash-flow chart** — a combined bar+line chart, income and expense as bars per month, running net balance as an overlaid line, all colors and gridlines pulled from the active theme's chart tokens (this chart was previously a major offender for looking "static/uncomfortable" against certain themes because its colors were hardcoded independent of the token system — on iOS, drive every color in this chart from the theme, including axis labels, gridlines, tooltip background, and the three data-series colors, and re-read them live if the theme changes while the screen is visible). Below the chart: a "Quick Cashout" control (amount field + button, debits the balance immediately) and a reverse-chronological transaction history list (icon by sign, title, type badge, date, signed amount, edit/delete). A prominent "New Transaction" action lets the user manually credit or debit their own balance with a title/amount/optional note/date (for things outside the goal system — a manual reward from a partner, a manual penalty, correcting an error).

### 5.6 Settings
- **Appearance:** the family picker (two swatch cards: Growth, Sumi, each showing a 3-dot color preview reflecting the *currently resolved* mode) and a light/dark/auto mode segmented control, plus the explanatory copy about app-icon behavior from Section 4.4.
- **Application preferences:** week-start-day toggle (Sunday/Monday).
- **Practice setup:** shortcuts into Measures and Goals management.
- **Data export:** two one-tap CSV exports — **Log Entries** (columns: Date, Activity name, formatted Value, RawValue, Unit, Logged-At timestamp) and **Transactions** (columns: Date, Time, Title, Amount, Type, Notes). On iOS, present these via the share sheet (`ShareLink`/`UIActivityViewController`) rather than a browser download — write a temp CSV file and share it, so the user can save to Files, AirDrop, email, etc.
- **Personal Access Tokens** (only shown/relevant when a self-hosted server connection is configured — Section 7.1c): list of existing tokens with created/last-used dates and a revoke action; a create flow that names a token, generates it server-side, and shows the raw value exactly once with a copy-to-clipboard control and an explicit "you will not see this again" warning.
- **Server connection:** (new for iOS, not present in the web app because the web app *is* the server's own frontend) — see Section 7.1.
- **HealthKit:** (new for iOS) — see Section 8. Per-measure link management: which measures are connected to which Health data types, direction (read-only from Health, write-only to Health, or both), and a global HealthKit authorization status/re-request control.
- Account info / sign out.

### 5.7 Auth
Sign up / log in (email + password) and a "Try Demo" path that spins up (or reuses) a local demo identity with no credentials, matching the web app's low-friction first-run option. This screen is only meaningful in "connect to a self-hosted server" mode; in local/iCloud mode there is no separate login step — the user's iCloud account *is* their identity, and first launch should go straight into an empty, ready-to-use app (see 7.1).

---

## 6. Existing backend API (reference, for self-hosted connection mode)

The current Node/Express/Prisma/Postgres server (dockerized, see the project's `docker-compose.yml`) exposes this REST surface. Reproduce this exact contract when building the "connect to a self-hosted server" networking client — it is a live, working server today, and matching its request/response shapes exactly (rather than reinventing a nicer-looking API for iOS) is what lets an existing self-hosted deployment work with the new app unmodified.

**Auth:** `Authorization: Bearer <token>` header on every route except `/auth/*`. Two token kinds accepted: a JWT from login/signup/demo, or a long-lived personal API token (prefix `kaizen_`) from the API-tokens feature — the server distinguishes by prefix. Base path is `/` (the frontend proxies `/api/*` to it; when the iOS app talks to a user-supplied server URL, hit these paths directly, not through an `/api` prefix, unless the user's specific deployment is proxied that way — make the base URL fully user-configurable).

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/auth/demo` | — | Creates/reuses a single demo user, returns `{ user, token }`. |
| POST | `/auth/signup` | `{ email, password, name }` | Returns `{ user, token }`. |
| POST | `/auth/login` | `{ email, password }` | Returns `{ user, token }`. |
| GET | `/users/me` | — | Returns the current user **and triggers cut settlement** (Section 3.2) as a side effect before returning — the iOS client relying on this server should treat this endpoint as "always fresh," not cache it long. |
| PUT | `/users/me` | `{ name?, weekStart?, theme? }` | Partial update. |
| GET | `/measures` | — | Includes nested `goals[]`. |
| POST | `/measures` | `{ name, unit, icon?, color?, type? }` | |
| PUT | `/measures/:id` | `{ name?, unit?, icon?, color?, type? }` | |
| DELETE | `/measures/:id` | — | Cascades to goals and entries. |
| GET | `/goals` | — | Includes nested `measure`. |
| POST | `/goals` | `{ measureId, timeframe, type, operator?, targetValue, rewardAmount?, cutAmount?, minPerEntry? }` | Server auto-stamps `cutStartsAt = now()` when `cutAmount > 0` is supplied on create. |
| PUT | `/goals/:id` | any subset of the above | Server stamps/clears `cutStartsAt` when `cutAmount` transitions across the `0` boundary (see 2.3). |
| DELETE | `/goals/:id` | — | |
| GET | `/entries?start=&end=` | — | Optional date-range filter; omit for all. Includes nested `measure`. |
| POST | `/entries` | `{ measureId, value, date }` | `date` as `"YYYY-MM-DD"`. Triggers Section 3.1 evaluation; response includes `{ entry, totalReward, rewardsEarned[] }`. |
| PUT | `/entries/:id` | `{ value?, date? }` | Re-triggers 3.1 evaluation for the (possibly new) date. |
| DELETE | `/entries/:id` | — | |
| POST | `/entries/batch` | array of `{ measureId? , measureName?, value, date }` | Bulk import; resolves `measureName` to an id by exact match if `measureId` omitted. Returns per-row success/failure. |
| GET | `/transactions` | — | **Triggers cut settlement** as a side effect, same as `/users/me`. |
| POST | `/transactions` | `{ type: "CREDIT"|"DEBIT", amount, title, description?, date? }` | Manual ledger entry; server maps to `MANUAL_CREDIT`/`MANUAL_DEBIT` internally and validates sufficient balance for a debit. |
| PUT | `/transactions/:id` | `{ notes?, amount?, title?, date? }` | Editing `amount` re-derives and adjusts the user's balance by the delta; the server infers sign from the transaction's existing type. |
| DELETE | `/transactions/:id` | — | Reverts the balance by the transaction's amount. |
| POST | `/transactions/cashout` | `{ amount }` | Debits balance, creates a `CASHOUT` transaction. |
| GET | `/api-tokens` | — | Never returns the raw token or hash, only metadata. |
| POST | `/api-tokens` | `{ name }` | Returns the raw token **once**. |
| DELETE | `/api-tokens/:id` | — | |

Money fields are transmitted as JSON numbers (floats) by this server today — when parsing into the iOS `Decimal` model (Section 2.1), convert via a decimal-safe path (e.g. through the numeric string representation) rather than `Decimal(Double)`, to avoid re-introducing float error at the boundary.

---

## 7. iOS architecture

### 7.1 Storage & sync — two distinct modes, chosen explicitly by the user, not blended

Do not attempt a single system that simultaneously syncs through iCloud *and* a self-hosted server *and* reconciles both — that's an unbounded conflict-resolution problem for money-shaped ledger data, and nobody asked for multi-master sync between two independent servers. Instead:

**(a) Default mode — Local device storage, synced via iCloud.** This is what a user gets with zero setup, and should be the default/first-run experience (no login screen at all — just an empty, ready Dashboard). Store the domain model (Section 2) in **SwiftData** (or Core Data if the target OS floor requires it) with its built-in **CloudKit** sync enabled (`ModelConfiguration(cloudKitDatabase: .private("iCloud.<bundle-id>"))`, or `NSPersistentCloudKitContainer` if using Core Data directly). This gives the user exactly what they'd expect: their data is on their device, backed up and synced across their own devices via their own iCloud account, with no separate account/login concept and no third party ever seeing the data. All of Sections 3's algorithms run **on-device** in this mode, at write-time (Section 3.1) and opportunistically on app-foreground/screen-appear (Section 3.2) — there is no server to call.

**(b) Explicit opt-in mode — Connect to a self-hosted server.** A clearly separate, clearly optional path (surfaced in Settings, or offered during first-run as an alternative to "just start using it locally"): the user enters a server base URL and either logs in / signs up or generates an API token, per Section 6's contract. In this mode, the iOS app becomes a **thin client of that server** — it is *not* additionally kept in SwiftData/iCloud at the same time (avoid dual-write). All reads/writes go over the network to that server; Section 3's algorithms are evaluated server-side exactly as they are today (the iOS app doesn't need to re-run 3.1/3.2 locally in this mode, though a lightweight local cache for offline viewing is reasonable — just don't let a locally-cached copy silently diverge from the server's ledger; treat the server as sole source of truth and the cache as read-through only).

**Switching between modes:** treat this as a deliberate, explained action (e.g. "Use this device's iCloud storage" vs "Connect to a Kaizen server"), not something inferred automatically. If a user wants to move data from local/iCloud into a fresh self-hosted server (or vice versa), that's a one-time export/import action (CSV export from Section 5.6, or a bespoke "push everything to this server" migration flow), not live bidirectional sync between the two.

**(c) API tokens (Section 2.6)** only exist and only matter in mode (b) — don't show token management UI at all when running in local/iCloud mode, since there's no server for a token to authenticate against.

### 7.2 Suggested app structure
- SwiftUI, `NavigationStack`-based, with a persistent bottom tab bar (Dashboard / Money / Settings, mirroring the web app's bottom nav) on phone, and an adaptive sidebar on iPad/regular-width per Apple's standard `NavigationSplitView` idioms — this is a legitimate place to *lean into* native iOS conventions (tab bar, split view, swipe-to-delete on lists, pull-to-refresh, context menus, sheet presentations for the day-editor and creation forms) rather than pixel-cloning the web app's own custom nav chrome. The instruction to "not feel like every other Swift app" is about **color, type, texture, and shape** (Section 4) — not about rejecting standard iOS navigation and interaction patterns, which is exactly what *would* make it feel foreign and un-native. Get the theme right and use normal SwiftUI structure.
- A `Theme` environment value (family + resolved mode + all Section 4 tokens) injected at the app root, read via `@Environment` in every view; a `ThemeManager`/`ObservableObject` (or `@Observable` model) owns the persisted family/mode selection and pushes updates through the environment plus (Section 4.4) sets the alternate app icon and live-observes system appearance for `system` mode.
- A repository/service layer per domain object (Measures, Goals, Entries, Transactions) with two concrete implementations behind a common protocol — a SwiftData-backed one for mode (a) and a URLSession-backed one for mode (b) — so the rest of the app (view models, screens) is written once against the protocol and doesn't know which storage mode is active.
- Business logic (Section 3) as a standalone, unit-testable module independent of SwiftData/network types (pure functions/structs over the domain model), used directly by the local repository and mirrored conceptually (already implemented server-side) when in server mode.

### 7.3 Native-feel checklist (things that make it iOS, not a ported web page)
- Haptics on meaningful state changes: logging an entry, a goal being met (reward fires), a cut settling, cashing out.
- Dynamic Type support throughout — the three theme font roles must all scale properly; test at accessibility text sizes, especially the compact heat-grid cells (they may need to reflow to a scrollable/larger layout at very large type sizes rather than clipping).
- Widgets: a small/medium Home Screen widget showing today's measures and streaks (or the current week's mini heat-grid) is a natural, low-risk native extension of the Dashboard's core visual — not required for parity, but strongly fits the product and is cheap to justify given WidgetKit's existence; treat as an encouraged enhancement, not a mandate.
- Standard iOS list interactions (swipe-to-delete/edit on Measures, Goals, Transactions lists; context menus for secondary actions) rather than always-visible hover-style action buttons (the web app had to work around "hover-only" controls being unreachable on touch — on native iOS, swipe actions and context menus are the correct, idiomatic solution to that exact problem, not a compromise).
- Respect Reduce Motion / Reduce Transparency accessibility settings when animating theme-switch transitions or rendering the Sumi paper texture's blur/opacity effects.

---

## 8. HealthKit integration

**Principle: Health is an optional data bridge per measure, never a replacement for Kaizen's own model.** Kaizen's `Entry`/`Goal`/reward-cut system continues to be the source of truth for the app's own logic (Section 3) regardless of any HealthKit link — linking a measure to Health means "also read from" and/or "also write to" a Health sample type, not "store this measure's data only in Health."

### 8.1 Per-measure link configuration
In Measures management (Section 5.3) or Settings → HealthKit (Section 5.6), a measure can optionally be linked to one HealthKit sample type, with a direction:
- **Read from Health** — a background/foreground sync pulls new Health samples (e.g. water logged in the Health app or by another app) into Kaizen as `Entry` rows for that measure, so goals/rewards/cuts see them.
- **Write to Health** — every Entry the user logs *in Kaizen* for that measure is also written to HealthKit as a sample, so it shows up in the Health app / is visible to other apps.
- **Both** — combine the two, with a de-duplication rule (see 8.4) so a value doesn't double-count when it round-trips.
- **None** — the default; a measure with no link behaves exactly as it does today, purely local to Kaizen.

### 8.2 Suggested measure→HealthKit type mapping
Use this as a starting map for the "link this measure to Health" picker; only offer types HealthKit actually supports reading/writing on the current OS, and confirm exact identifiers/units against the current HealthKit documentation before shipping, since Apple's available sample types have expanded over recent OS releases and this list should not be taken as exhaustive:

| Kaizen measure example | HealthKit type | Kind | Notes |
|---|---|---|---|
| Water intake | `HKQuantityType(.dietaryWater)` | Quantity | Unit: fluid ounces or milliliters — convert to/from the measure's own `unit` string. |
| Steps | `HKQuantityType(.stepCount)` | Quantity | Typically read-only in practice (Health aggregates from many sources); treat as read-from-Health. |
| Exercise / workout minutes | `HKQuantityType(.appleExerciseTime)`, or a full `HKWorkout` if the measure represents a specific workout type | Quantity / Workout | For a simple "minutes of activity" measure, `appleExerciseTime` is the closer fit; for something the user wants to appear as a real workout session (with duration, calories, etc.), write an `HKWorkout` instead of a bare quantity sample. |
| Active energy / calories | `HKQuantityType(.activeEnergyBurned)` | Quantity | |
| Mindfulness / meditation minutes | `HKCategoryType(.mindfulSession)` | Category (duration-based) | |
| Sleep duration | `HKCategoryType(.sleepAnalysis)` | Category | Sleep samples are interval-based (start/end), not a single point value — a "minutes slept" measure needs to sum overlapping/adjacent intervals for a given calendar day, not just count samples. |
| Body weight | `HKQuantityType(.bodyMass)` | Quantity | |
| Mood / "state of mind" style check-ins | Verify current State-of-Mind related HealthKit APIs on the target OS version | — | Newer than the rest of this table; confirm read/write scope and exact identifiers before committing to this mapping. |
| Medication taken | Verify current HealthKit medication-tracking APIs (medication logging was added to the Health app in recent iOS versions) on the target OS version, including whether third-party read/write access is exposed and under what entitlement | — | **Do not assume a specific API shape here without checking current documentation first** — this is the one row in this table most likely to have changed or to have restricted third-party access; if third-party write access isn't available, fall back to keeping "medication taken" purely a Kaizen-native measure (a `count`-type daily goal, e.g. "at least 1x/day") with no Health link, which still fully satisfies the feature from Kaizen's own side. |

For any measure type not covered above (a generic "Reading pages" or "Guitar practice minutes" measure), there is no meaningful HealthKit counterpart — simply don't offer a Health link for it; not every measure needs one.

### 8.3 Permissions and background behavior
- Request HealthKit read/write authorization **per specific type**, only for the types the user has actually chosen to link, at the moment they configure a link — never request a broad blanket authorization up front on first launch.
- Use `HKObserverQuery` + background delivery (`enableBackgroundDelivery`) for "read from Health" links so new Health samples (logged elsewhere) flow into Kaizen's entries promptly without the user having to open the app, subject to HealthKit's own background delivery frequency limits.
- Health authorization can be silently denied/limited by the user at any time outside the app (in the Health app's own privacy settings) — the sync layer must degrade gracefully (stop attempting reads/writes for a type, surface a clear "Health access needed" state in Settings) rather than erroring the whole app.

### 8.4 De-duplication and the reward/cut boundary
When a measure is linked in "read from Health" (or "both") mode, an incoming Health sample becomes a Kaizen `Entry` exactly as if the user had logged it by hand — meaning it participates fully in Section 3's reward/cut evaluation. Two things to guard against:
1. **Round-trip double counting:** if a measure is linked in "both" directions, an entry the user logs *in Kaizen* gets written out to Health, and the read-sync must recognize that sample as one it already knows about (tag written-out samples with a stable identifier, e.g. via `HKMetadataKeySyncIdentifier`, so the read path can skip its own writes) rather than reading it back in as a second, duplicate entry.
2. **Reward/cut timing surprises:** because HealthKit sync can be delayed or run in the background, a reward could fire (or a cut settle) at a moment the user isn't looking at the app, purely because a Health sample arrived late. This is expected and fine — the same "eager reward / lazy cut" rules from Section 3 apply regardless of an entry's origin — but consider a lightweight local notification ("Nice — Water goal met" / a cut being applied) for entries that originate from a background Health sync specifically, since the user has no other moment of feedback for those the way they do when logging by hand in the app.

---

## 9. Feature parity checklist

Use this to confirm nothing was dropped in translation. Every row must have a native iOS equivalent before considering the port complete.

- [ ] Auth: email/password signup & login, and a no-friction "demo"/first-run path *(mode-(b)-only; irrelevant in local/iCloud mode per 7.1)*
- [ ] Measures: create, edit, delete (with cascade warning), icon picker (32 icons → SF Symbols), 14-color palette
- [ ] Measure types: `number` and `time` (minutes-since-midnight encoding, both clock-time and duration rendering contexts)
- [ ] Goals: create/edit a single record carrying both reward and cut amounts; timeframe (daily/weekly only — do not carry forward the unimplemented "monthly" option without actually implementing it); type (total/count) with `minPerEntry`; operator (at-least/at-most, with time-aware wording)
- [ ] Rewards tab and Cuts tab as two filtered views of the same goal list; "add a cut to an existing reward-only goal" shortcut
- [ ] Entries: log, edit, delete; batch/bulk creation path (equivalent to `/entries/batch`, useful for a future import feature or Health backfill)
- [ ] Reward evaluation: exact algorithm in 3.1, including multi-goal-per-measure, eager mid-period firing
- [ ] Cut settlement: exact algorithm in 3.2, including the never-retroactive guarantee, the shared reward/cut idempotency key, and the 90-day ceiling
- [ ] Streak calculation: exact algorithm in 3.4
- [ ] Daily progress / heat-grid bucketing: exact algorithm in 3.3
- [ ] Dashboard: phone heat-grid week view + month calendar view; wider-layout week-chart + month calendar view; tap-to-edit day sheet
- [ ] Log Entries screen: week-scoped list, quick add per measure, week/month navigation
- [ ] Transactions: balance/earned/spent stat strip, theme-driven cash-flow chart, quick cashout, manual credit/debit entry, editable/deletable history
- [ ] Settings: appearance (family + mode), week-start-day, CSV export (entries & transactions) via share sheet, API token management *(mode-(b)-only)*, server connection management, HealthKit link management, account/sign-out
- [ ] Theming: both families, both modes each, exact tokens (Section 4), instant switching, persistence, alternate app icon per family
- [ ] Typography: exactly three roles per theme, correct face per role per theme (Section 4.2), no stray fourth face
- [ ] Sumi paper texture: rendered as genuine layered generative texture (grain + wash + specks + spatter), not a flat tint
- [ ] Local storage + iCloud sync as the default, zero-setup mode
- [ ] Explicit, optional self-hosted-server connection mode matching the Section 6 API contract exactly
- [ ] Per-measure HealthKit linking (read/write/both), scoped permission requests, background delivery for read-links, de-duplication on round-trip

---

## 10. Explicit non-goals / decisions already made (don't re-litigate these while building)

- **No three-way sync** between local storage, iCloud, and a self-hosted server simultaneously (Section 7.1). Pick one active storage mode at a time.
- **No new theme families invented** beyond Growth and Sumi unless separately requested — the existing two, done well in both light and dark, is the scope.
- **Money is `Decimal`, not `Double`,** on iOS even though the current backend uses floats — this is a deliberate improvement, not a deviation to flag as a discrepancy.
- **"Monthly" goal timeframe** exists as a dangling, unimplemented option in the web app's type system and must not be silently ported as a selectable-but-broken option — either implement it fully (extend Sections 3.1/3.2's period logic to a calendar-month window) or omit it from the picker entirely.
- **Notifications/reminders** ("log your water today") are not a current web app feature. They fit the product well and are a reasonable native addition, but treat them as an optional enhancement to propose, not a required parity item — don't let scope creep here block shipping the actual parity checklist in Section 9.
