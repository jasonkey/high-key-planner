# -*- coding: utf-8 -*-
"""Build a High Key weekly-planner workbook.

    python build.py ../students/example.py     one student
    python build.py --blank                    the fill-in-yourself template

A student file defines STUDENT, and optionally NOTES as [(heading, [lines]), ...]
added to the key tab.
Real student files live in students/ and are git-ignored; only example.py is committed,
so no real schedule ever reaches the repository.
"""
import sys, os, runpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from openpyxl import Workbook
from planner import mondays, build_week, build_blank_key, build_student_key

TITLE = "HIGH KEY  ·  BHS WEEKLY PLANNER"


def emit(spec, subtitle, fname, extra):
    wb = Workbook(); wb.remove(wb.active)
    for m in mondays():
        build_week(wb, m, spec, subtitle)
    if spec is None:
        build_blank_key(wb, subtitle)
    else:
        build_student_key(wb, spec, subtitle, extra or [])
    wb.active = 0
    wb.save(fname)
    print("saved %s - %d tabs" % (fname, len(wb.sheetnames)))
    return fname


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 1
    if argv[1] == "--blank":
        emit(None, TITLE, "High_Key_Planner_TEMPLATE.xlsx", None)
        return 0
    mod = runpy.run_path(argv[1])
    spec = mod["STUDENT"]
    name = spec.get("name", "student")
    emit(spec, name.upper() + "  ·  " + TITLE,
         "High_Key_Planner_%s.xlsx" % name, mod.get("NOTES"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
