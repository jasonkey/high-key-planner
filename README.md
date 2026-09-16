# High Key · BHS Weekly Planner

Brookline High School runs a six-day rotation inside a five-day week, so "Tuesday"
tells a family nothing about when their student starts or ends the day. This project
turns a student's Aspen schedule into a printable week-by-week planner for the whole
2026/27 year, with an arrival time and a dismissal time on every single day.

Two things live here:

| | what it is | who runs it |
|---|---|---|
| **`site/index.html`** | A single-page web tool. Paste in an Aspen schedule, check it, print the year. | Students, families, counselors — in a browser |
| **`workbooks/`** | Python scripts that build the same planner as a formatted `.xlsx`, plus Google Calendar `.ics` exports. | Whoever maintains this |

Both read the same calendar data, so they cannot disagree with each other.

## Privacy

This is the constraint the whole layout is built around.

- **No real student schedule is in this repository.** Student files live in `students/`,
  which `.gitignore` excludes except for `example.py` — invented data, not a real person.
- **The web tool sends nothing anywhere.** No server, no accounts, no logins, no analytics,
  no AI service. Everything runs inside the browser tab. Open `site/index.html` from a
  local file and it works completely, with the network off.
- **Calendar exports drop teacher names**, keep room numbers but strip the `Rm` label,
  mark every event **free** rather than busy, and carry **no alarms**.

If you add a feature that would trade any of this for convenience, say so out loud before
building it.

## Use it

**https://jasonkey.github.io/high-key-planner/**

Paste an Aspen schedule, check it, print the year. Nothing to install, and nothing
leaves the browser.

`site/index.html` is one self-contained file, so you can also save it and open it
from disk with the network off. To serve a local copy:

```bash
python3 -m http.server -d site 8000
```

## Build a planner for a real student

```bash
cd workbooks
python3 build.py --blank                    # fill-in-yourself template
python3 build.py ../students/example.py     # a full-year .xlsx planner
python3 calendars.py ../students/example.py --startend    # .ics exports
```

Copy `students/example.py`, replace the courses from the student's Aspen
**My Info → Schedule → List** view, and run `build.py` on that file. Git ignores it.
`students/README.md` explains the `Schedule` column, which is the part that matters.

## Work on it

Python 3 and `openpyxl` build the planners. Node is needed only to run the tests.

**`site/index.html` is generated — never edit it by hand.** Edit `src/web/*`, then:

```bash
cd src
python3 gen_district_data.py   # only if you changed workbooks/planner.py
python3 assemble.py            # src/web/* + district_data.json -> site/index.html
```

Then run both halves of the check — the workbook side and the browser side:

```bash
cd workbooks && python3 build.py --blank && python3 build.py ../students/example.py && python3 verify.py
cd tests && npm install && npm test
```

`verify.py` ends with `TOTAL ERRORS: 0` and `npm test` with `0 failed`. CI runs both
on every push and pull request, and refuses to deploy if either fails or if
`site/index.html` is out of date with `planner.py`.

## Deploy

Settings → Pages → Source → **GitHub Actions**. `.github/workflows/pages.yml`
publishes `site/` on every push to `main`; nothing is built at deploy time. It has to
be an Actions deploy, because a branch deploy can only serve the repository root or
`/docs`.

**Before publishing:** Pages on a free account requires a public repository, so
everything committed becomes world-readable. `students/` is git-ignored except
`example.py`, and `docs/district-sources.md` is written without identifying details.
Keep it that way.

## Layout

```
site/            the deployable page — one generated, self-contained HTML file
src/             source for that page
  web/           head.html, body.html, app.js, ui.js, xlsx.js
  district_data.json   the 2026/27 calendar, generated
  assemble.py    src/web/* + data  -> site/index.html
  gen_district_data.py  planner.py -> district_data.json
workbooks/
  planner.py     the calendar engine: rotation, block map, times, lunch split
  build.py       -> .xlsx
  calendars.py   -> .ics     (ics.py, startend.py are its parts)
  verify.py      audits generated workbooks against district data
students/        one file per student — git-ignored except example.py
docs/
  district-sources.md   which facts came from which district document,
                        and which are still unpublished
```

## How the schedule actually works

`workbooks/planner.py` is the source of truth. The core of it is `BLOCKMAP`, which says
which lettered block sits in which period on each rotation day. Every block meets four
times per six-day cycle, so `A1`–`A4` are four distinct sessions, and a course can meet
on only some of them.

Aspen's `Schedule` column encodes this directly: `2(2,5) 3(3,6)` means period 2 on
rotation days 2 and 5, and period 3 on days 3 and 6. That string alone places a course
on every day of the year.

Third period is split by lunch, and which half a student attends depends on the course's
department prefix. `CE FP TE MA PA SC VA WE` means class first (10:54–12:04) then
Lunch 2; `EL EN ID SO SW TU WL` means Lunch 1 (10:49–11:19) first, then class.

This is documented, and sourced, in `docs/district-sources.md` — including the handful of
dates the district has not published, which the planner marks rather than guesses.

## Verification

The block map was checked against the district's own published block calendar: 209 of 209
events match. The rotation runs an unbroken 1→6 cycle across all 162 school days. The
browser tool's scheduling logic was diffed against a verified spreadsheet across all 158
school days with zero differences. The `.ics` exports match the spreadsheet across 487
class entries.

`verify.py` re-runs the workbook half of that on demand and `tests/` the browser
half — see **Work on it** above. `cd tests && npm run print-check` additionally prints
a real PDF through Chrome and measures that the colours survive; it needs Chrome and
`pdftoppm`, so it is a local check rather than a CI step.
