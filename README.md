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

## Running the web tool

`site/` is static and self-contained. Open `site/index.html` in a browser, or serve it:

```bash
python -m http.server -d site 8000
```

To publish it, set Settings → Pages → Source to **GitHub Actions**. The workflow in
`.github/workflows/pages.yml` uploads `site/` on every push to `main`. Nothing needs
building at deploy time — it checks that the committed page is up to date and that
`verify.py` is clean, then serves the folder as-is.

A branch deploy will not work here: when Pages deploys from a branch it can only serve
the repository root or `/docs`, never an arbitrary folder like `/site`, and `/docs` in
this repo holds the sourcing notes rather than the site.

**Before you publish:** GitHub Pages on a free account requires a public repository, so
everything committed becomes world-readable. `students/` is git-ignored except
`example.py`, and `docs/district-sources.md` is written without identifying details —
keep it that way.

### Editing it

`site/index.html` is generated — do not edit it by hand. Edit the files in `src/web/`
and re-assemble:

```bash
cd src
python assemble.py          # src/web/* + district_data.json -> site/index.html
```

If you change the school calendar, regenerate the data the page reads first:

```bash
cd src
python gen_district_data.py # workbooks/planner.py -> src/district_data.json
python assemble.py
```

## Building workbooks and calendars

```bash
cd workbooks
python build.py --blank                    # fill-in-yourself template
python build.py ../students/example.py     # one student's full-year planner
python calendars.py ../students/example.py --startend
python verify.py                           # audit the output against district data
```

To make a planner for a real student, copy `students/example.py`, replace the courses
from their Aspen **My Info → Schedule → List** view, and run `build.py` on it. Git ignores
the new file. `students/README.md` explains the `Schedule` column notation.

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

`workbooks/verify.py` re-runs the workbook half of that on demand.
