# BHS 6-day rotation — verified reference and current build state

**Updated:** Sept 14, 2026 · supersedes the open items in the earlier QA note of Sept 13, 2026

## The source that settled everything

The **BHS School Year Calendar 2026/2027** (the printed one-page year grid) carries the rotation
day for every school day plus quarter ends, exams and MCAS. It was read off the rendered PDF, not
text-extracted. Three independent cross-checks, all clean:

| Check | Result |
|---|---|
| Year calendar vs. the 65 rotation days on the district Google main calendar | 65 / 65 |
| Year calendar vs. all 209 events on the A–G block calendars | 209 / 209 |
| Rotation forms an unbroken 1→6 cycle across all 162 school days | 0 breaks |
| Aspen "Schedule" column decoded vs. the block map | 0 mismatches |

On the year grid, **`X` marks a Day 3** and **`Co` marks a Day 6** — every instance, all year.

## Term dates (previously unknown — now confirmed)

- **Q1 ends Mon Nov 9, 2026** · **Q2 + Semester 1 end Thu Jan 28, 2027**
- **Q3 ends Mon Apr 12, 2027** · **Q4 + school year end Mon Jun 21, 2027**
- **Midterm exams:** Tue–Thu Jan 26–28, 2027. **Final exams:** Wed–Fri Jun 16–18, 2027.
- **Grade 10 MCAS:** Mar 23–24, May 18–19, Jun 1–2, 2027.
  MCAS-day structure: Session 1 = A, C, E, T/X blocks · Session 2 = B, D, F, G.
- Exam, MCAS and special-schedule days carry **no rotation day** and do not advance it.
- Winter break Dec 24 – Jan 1; school resumes **Mon Jan 4 = Day 4**.
- Reserved snow make-up days: Jun 22–25 and Jun 28.

## The T block question — resolved

T1 is 5th period on **Day 3** (1:55–2:25) followed by X Block to 3:05.
T2 is 5th period on **Day 6** (1:55–2:15) followed by **early dismissal at 2:15**.

Confirmed three ways: Aspen lists Advisory as `T Block, 5(3,6)`; the district T Block calendar
puts T1 on Sep 10/18/29 and T2 on Sep 15/24/Oct 2, all Day 3s and Day 6s; and the block calendars
publish no A–G class in 5th period on any Day 3 or Day 6.

*Caution for anyone re-reading that T Block calendar:* it is a month-grid PDF, and text extraction
shifts its events one column left. Render it as an image and read it visually.

## Block-to-period map (district-verified, identical for every BHS student)

|  | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 |
|---|---|---|---|---|---|---|
| **1st** 8:20–9:30 | A1 | B1 | A2 | B3 | A3 | B4 |
| **2nd** 9:37–10:47 | D1 | C1 | B2 | D3 | C3 | A4 |
| **3rd** (split) | E1 | D2 | C2 | F3 | D4 | C4 |
| **4th** 12:38–1:48 | F1 | E2 | G2 | E3 | G4 | E4 |
| **5th** 1:55–3:05 | G1 | F2 | **T1** | G3 | F4 | **T2** |

Z Block is 7:30–8:15. The district block calendars never publish a 3rd-period session; the six
they omit (C2, C4, D2, D4, E1, F3) are exactly the six that sit in 3rd period.

**3rd-period lunch split**, by course department code:
CE, FP, TE, MA, PA, SC, VA, WE → Class 1 (10:54–12:04) then Lunch 2 (12:06–12:36).
EL, EN, ID, SO, SW, TU, WL → Lunch 1 (10:49–11:19) then Class 2 (11:21–12:31).

## Reading an Aspen schedule

The `Schedule` column is the whole schedule: `2(2,5) 3(3,6)` means period 2 on rotation days 2
and 5, period 3 on days 3 and 6. That alone places every class — the block letter is only a label.
`Term` (FY / S1 / S2) governs semester swaps. Aspen's list view carries **no room numbers**.

## Built and verified

Real schedules are never described here. These are the shapes that have been exercised, with
the identities left out on purpose.

- **A full year from an Aspen list export** — 41 weekly tabs, Sep 14 → Jun 21, 209/209 block
  events verified. It exercised the semester swap in both directions: a 3rd-period course with
  an `S1`/`S2` pair changed on Jan 29, while a course marked `FY` correctly did **not**.
- **A full year from a photographed grid** — same structure, but a photographed grid carries no
  `Term` column, so semester-2 course changes are not reflected. Rebuild any such planner from
  an Aspen list export before the spring.
- **Blank master template** — dates and rotation days filled, class cells empty.
- **Planner Builder (HTML)** — paste an Aspen list, get the same printable weeks. Runs entirely
  in the browser, no server, no data leaves the device. Its scheduling logic was diffed against a
  verified spreadsheet across all 158 school days: 0 differences.

## Still open

1. **Dismissal times for Nov 25, Dec 3 (12:40 PM is published) and Apr 8** — Nov 25 and Apr 8 are
   still unpublished.
2. **Exam schedules** for midterms and finals — not on any district calendar; write in when sent.
3. **Report card / progress report dates** — not published. Four dates are outlined on the year
   grid with no legend (Oct 7, Dec 15, Mar 8, May 18), each near a quarter midpoint, which usually
   means progress reports. Unconfirmed.
4. **Athletics in the `ST` department** — Aspen gives a winter-season sport `Term` `S2` in a PM
   block. If `S2` there means the winter athletic season rather than semester 2, it starts well
   before January and the term logic would place it wrongly. Sports are not placed on any date in
   the planners, so nothing is wrong today; confirm before adding them.
5. **PM block times** are not published anywhere.
