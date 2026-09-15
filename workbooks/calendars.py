# -*- coding: utf-8 -*-
"""Build the .ics calendar files for one student.

    python calendars.py ../students/example.py              three calendars
    python calendars.py ../students/example.py --startend   plus the start/end one

Writes, next to this script:

    <Name>-1-regular-days.ics    all-day "Day 3" markers and NO SCHOOL days
    <Name>-2-late-and-early.ics  late starts, early releases, exams, last day
    <Name>-3-classes.ics         each class as a timed event
    <Name>-start-and-end.ics     two 45-minute family windows per school day

Every event is marked FREE, never busy, and carries no alarm of any kind.
Teacher names are dropped. Room numbers appear bare, with no "Rm" label, so
they mean little to anyone outside the building.

How far each calendar runs
--------------------------
Courses can change at the semester break (Fri Jan 29, 2027). A calendar that
guessed past a change would be wrong in a way no one would notice, so:

  * a student with no S2 course listed  ->  the calendar stops the day before
    the break, and you re-run it once the spring schedule is confirmed;
  * a student whose S2 courses are listed  ->  it runs one week past the break,
    and those six days carry a "confirm changes" note.

A student file can override either by setting ICS_LAST_DAY / ICS_Q3_DAYS.
"""
import sys, os, runpy, datetime as dt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planner as p
import ics as I
import startend as SE


def school_days_from(start, n):
    out, d = [], start
    while len(out) < n and d <= p.LAST_DAY:
        if d in p.DAYNUM:
            out.append(d)
        d += dt.timedelta(days=1)
    return out


def window(spec, mod):
    """(last_day, q3_days) — see the module docstring."""
    if "ICS_LAST_DAY" in mod:
        return mod["ICS_LAST_DAY"], set(mod.get("ICS_Q3_DAYS", ()))
    has_s2 = any(c.get("term") == "S2"
                 for entries in spec["courses"].values() for c in entries)
    if not has_s2:
        return p.SEM2_START - dt.timedelta(days=1), set()
    q3 = school_days_from(p.SEM2_START, 6)
    return q3[-1], set(q3)


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 1
    mod = runpy.run_path(argv[1])
    spec = mod["STUDENT"]
    name = spec.get("name", "student")
    salt = name.lower()
    last_day, q3 = window(spec, mod)

    for line in p.unplaceable_lines(spec):
        sys.stderr.write("  " + line + "\n")

    for fn, n in I.build(spec, name, salt, last_day, q3, name):
        print("%-34s %3d events" % (fn, n))

    if "--startend" in argv[2:]:
        out = "%s-start-and-end.ics" % name
        n, _ = SE.build(spec, name, salt, last_day, q3, out)
        print("%-34s %3d events" % (out, n))

    print("through %s" % last_day.strftime("%a %b %-d, %Y"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
