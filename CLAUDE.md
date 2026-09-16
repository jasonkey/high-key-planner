# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This is a standalone git repository (`/Users/key/GIT/high-key-planner`), not part of the
`dot` dotfiles repo — an earlier version of this note said otherwise. No dotfiles
`CLAUDE.md` applies, and nothing here is symlinked or sourced by a shell.

`README.md` explains the product; `docs/district-sources.md` records which district
document each calendar fact came from and which facts are still unpublished. Read
`district-sources.md` before changing any date, time, or block assignment.

## Commands

Python 3 + `openpyxl` (the only runtime dependency; workbook code only). The browser
tests under `tests/` add Node + `jsdom`, dev-only and confined to that directory.

```bash
# Web tool — site/index.html is GENERATED, never hand-edit it
cd src
python3 gen_district_data.py   # workbooks/planner.py -> src/district_data.json
python3 assemble.py            # src/web/* + district_data.json -> site/index.html
python3 -m http.server -d ../site 8000      # serve it (opening the file directly also works)

# Workbooks and calendars (all output lands in workbooks/, git-ignored)
cd workbooks
python3 build.py --blank                    # High_Key_Planner_TEMPLATE.xlsx
python3 build.py ../students/example.py     # High_Key_Planner_Example.xlsx
python3 calendars.py ../students/example.py --startend
python3 verify.py                           # audit; requires BOTH builds above to exist first

# Browser-side tests — drive the built site/index.html, so assemble.py first
cd tests
npm install && npm test                    # 51 assertions, no browser needed
npm run print-check                        # needs Chrome + pdftoppm; not in CI
```

There is no linter, and no build step beyond `assemble.py`. Two regression checks
guard the two halves of the project — run both after any change.

`tests/run.js` covers the browser half: it loads the **built** `site/index.html`
through jsdom and drives it the way a family would, so it catches things a syntax
check cannot — a handler referencing markup that was deleted, a `ReferenceError`
reachable only from one dropdown value, a stale `district_data.json`. Run
`assemble.py` before it or you are testing the previous build.

`verify.py` is the other half: it loads the two generated workbooks and diffs them against
`workbooks/district_block_calendar.json` (209 events transcribed from the district's
own published block calendar — an independent source, which is the only reason the
check means anything). It prints `TOTAL ERRORS: 0` when clean. After touching
`planner.py`, run the three build commands and `verify.py`.

Two limits on that check, both worth knowing before you trust it:

- **`verify.py` hard-codes what `students/example.py` contains** — the course titles
  (`{"A": "SPANISH 2", ...}`), `late_days=(1,5)` and `lunch1_days=(1,)` are literals in
  its `audit()` call. Editing `example.py` breaks `verify.py` until those are updated
  too. The TEMPLATE workbook is only loaded and counted, not audited.
- **It covers the Python side only.** `tests/run.js` covers the browser side, but
  nothing diffs the two implementations against each other; that agreement still
  rests on both reading `district_data.json` and on changes being made twice.
- **Print colour is not checked by `npm test`.** The fast suite asserts the
  `print-color-adjust` rule exists; `npm run print-check` proves it works by
  printing a real PDF through Chrome and measuring the colour left in it. That one
  needs Chrome and `pdftoppm`, so it is a local check rather than a CI step.

## Architecture

```
workbooks/planner.py   ← single source of truth for the school calendar
    ├── workbooks/build.py      -> .xlsx        (via openpyxl)
    ├── workbooks/calendars.py  -> .ics         (ics.py, startend.py are its parts)
    ├── workbooks/verify.py     audits the .xlsx against district_block_calendar.json
    └── src/gen_district_data.py -> src/district_data.json
            └── src/assemble.py + src/web/* -> site/index.html
```

Colours: `--dark` (#092142) and `--accent` (#ce222f) are Brookline High's navy and
red, and they are **decoration only** — page header, title bar, day headers, the
after-school bar. Everything that carries meaning keeps its own colour: `--late`,
`--early`, `--event`, `--exam`, `--mcas` and the per-course fills. `--accentbg` is
deliberately neutral rather than red-derived; a pink arrival row makes `LATE START`
stop reading as a warning. The same three values live in `planner.py` (`DARK`,
`ACCENT`, `ACCENTBG`) and `xlsx.js` (`DARK`, `ACC`, `ACCBG`) — change all three.

`planner.py` holds the raw year: `DAYNUM` (date → rotation day 1–6), `CLOSED`,
`SPECIAL`, `EXAM_DAYS`, `MCAS_DAYS`, `SNOW_DAYS`, `EVENTS`, `SEM2_START`,
`BLOCKMAP` ((rotation day, period) → block session like `A1`), and `CLASS1_LUNCH2`
(department prefixes that eat lunch second). `resolve_day(spec, dn, day)` turns a
student spec plus a rotation day into the printed rows — arrival, five periods, the
split third period, dismissal. Also there: `LAST_DAY`, `PROGRESS`, and `MCAS_S1`/`MCAS_S2`
(which blocks sit in each MCAS session).

`gen_district_data.py` builds its JSON from an **explicit dict**, not by reflection, so a
new `planner.py` constant does not reach the browser until you add it there by hand.

**Two parallel implementations exist by design.** `planner.resolve_day` (Python) and
`app.js resolveDay` (browser) implement the same rules, as do `build.py`'s openpyxl
styling and `src/web/xlsx.js`'s ExcelJS styling. They stay in agreement only because
both read the same data: the JS side gets it from `district_data.json`, regenerated
from `planner.py`. **Any change to scheduling logic has to be made on both sides, and
any change to calendar data means re-running `gen_district_data.py` + `assemble.py`.**

The shared-data guarantee has one real gap: **bell times inside the day are duplicated
string literals in both languages.** `district_data.json` carries `periodTimes` for
periods 1, 2, 4 and 5 only — the lunch-split times (`10:49 - 11:19`, `10:54-12:04`,
`11:21-12:31`, `12:06 - 12:36`) and the T-block times (`1:55 - 2:25` / X to `3:05`,
`1:55 - 2:15` early) are typed out in `planner.resolve_day` and again in
`app.js resolveDay`. Changing one of those means grepping for the literal in both.

### Built but not offered

`yearCalendarHtml()` in `app`/`ui.js` renders the one-page year-at-a-glance sheet —
ten Mon–Fri month grids stamped with rotation days — and its styles are in
`head.html`, but there is no control for it on the page. `ui.js` publishes it as
`window.__YEARCAL__` purely so `tests/run.js` keeps exercising it; dormant code
that nobody runs stops working quietly. To bring it back: restore the checkbox in
`body.html` and the `out.unshift(...)` in `renderWeeks`.

### Generated files — do not edit

- `site/index.html` — output of `src/assemble.py`. Edit `src/web/{head,body}.html`,
  `src/web/{app,ui,xlsx}.js` instead.
- `src/district_data.json` — output of `src/gen_district_data.py`.
- `*.xlsx`, `*.ics` in `workbooks/` — git-ignored build products.

The first two are generated **and committed**: Pages publishes `site/` as it is found in
the repo, with no build step, so a regenerated page has to be committed like source.
Generation is deterministic — re-running both scripts on an unchanged `planner.py` leaves
`git status` clean, which is the cheap way to confirm the committed output is in sync.
`.github/workflows/pages.yml` enforces exactly that and fails the deploy if it drifts.

### Web module wiring

`assemble.py` concatenates in a fixed order and splits the result on the first
`</style>` to form `<head>`/`<body>`, so keep all CSS in `head.html` and no stray
`</style>` anywhere. It injects the calendar as `window.__DISTRICT__` in a `<script>`
before `app.js`, which reads it at top level (`const D = window.__DISTRICT__`), so that
tag stays first. Load order is load-bearing: `app.js` publishes `window.__BHS__`,
`ui.js` consumes it and publishes `window.__WEEKS__` / `__EVEROWS__` / `__BSNOTE__`,
`xlsx.js` consumes both. Nothing is minified or bundled — the output stays one
readable file so a family can audit it.

`site/` is one self-contained HTML file with no external assets, so it works equally from
`file://` and from a server. Keep it that way: the page is meant to survive being emailed
to a family as a single attachment.

### Deployment

`.github/workflows/pages.yml` publishes `site/` to GitHub Pages on every push to `main`
(Settings → Pages → Source must be set to **GitHub Actions**). Before uploading it
regenerates the page and fails if the committed output differs, then runs `verify.py`
and fails unless it prints `TOTAL ERRORS: 0` — a stale or unverified page never ships.

It has to be an Actions deploy. A branch deploy can only serve the repo root or `/docs`,
and `/docs` holds `district-sources.md`. `site/.nojekyll` is belt-and-braces against
Jekyll touching the output.

## Privacy constraints

These are the product, not a preference. Do not trade them for convenience without
saying so explicitly first.

- **No real student schedule is ever committed.** `.gitignore` excludes `students/*`
  except `example.py` and `README.md`. Every other file in `students/` is a real
  person's schedule — never commit one, never name one, and never paste its contents
  into a commit message, PR, issue, or anything else that leaves the machine. This repo
  is published to GitHub Pages, so everything committed is world-readable.
- **The web tool sends nothing anywhere.** No server, accounts, analytics, or AI service.
  The one outbound request is `xlsx.js` lazy-loading ExcelJS from cdnjs when the user
  clicks the .xlsx download — a code fetch, not data leaving. Don't add others.
- **`.ics` exports drop teacher names**, keep room numbers but strip the `Rm` label,
  mark every event `TRANSP:TRANSPARENT` (free, not busy), and carry no alarms.
- Calendars deliberately stop at `SEM2_START` (Jan 29, 2027) for students with no S2
  course listed, rather than guessing past a schedule change (see `calendars.py`'s
  `window()`).

## Domain facts worth knowing before editing

- BHS runs a **six-day rotation inside a five-day week**, so a weekday says nothing
  about a student's day. Every block meets four times per cycle, so `A1`–`A4` are four
  distinct sessions and a course may meet only some of them (`only=[2,4]` in a student
  spec, from Aspen's `A(2,4)`).
- Aspen's **`Schedule` column is the whole schedule**: `2(2,5) 3(3,6)` = period 2 on
  rotation days 2 and 5, period 3 on days 3 and 6. The block letter is only a label.
  Aspen's list view carries no room numbers; students add them in step 2.
- **Third period is split by lunch**, and which half a student attends comes from the
  course's two-letter department prefix (`CLASS1_LUNCH2` in `planner.py`, `class1Lunch2`
  in the JSON).
- **5th period on Days 3 and 6 is T block**: T1 runs to 2:25 then X block to 3:05; T2
  ends at 2:15 with early dismissal. Arrival and dismissal are derived from the first
  and last period a student actually has class, not from bell times.
- Exam, MCAS and special-schedule days carry no rotation day and do not advance it.
- Facts the district has not published (some dismissal times, exam schedules) are
  **marked as unknown in the output rather than guessed** — `SPECIAL` entries say
  "time not published", and `startend.py` emits `?…when?` windows. Keep that behavior.

## Student specs

`students/example.py` is the invented reference; copy it rather than writing one from
scratch. A spec is a `STUDENT` dict (`name`, `palette`, `courses` keyed by block letter
`A`–`G` plus `T`, each a list of course dicts with `term` FY/S1/S2, `code`, `title`,
`teacher`, `room`, `color`, optional `only`) and an optional `NOTES` list of
`(heading, [lines])` for the KEY tab. `build.py` and `calendars.py` load it with
`runpy.run_path`. `calendars.py` also honors optional `ICS_LAST_DAY` / `ICS_Q3_DAYS`.
