# -*- coding: utf-8 -*-
"""An invented student, for demos and tests. Not a real person's schedule.

Copy this file to students/<name>.py and replace the courses. Everything in
students/ except this file is git-ignored, so real schedules stay off GitHub.

  block   one entry per course in that block. Use two entries with term "S1"
          and "S2" when the course changes at the semester break.
  only    the sessions a course actually meets, e.g. [2, 4] for a course Aspen
          shows as A(2,4). Omit it when the course meets all four.
  color   any key you like; the same key always gets the same colour.
"""

STUDENT = {
    "name": "Example",
    "evening_note": None,                 # or ("6:15 PM", "DINNER")
    "palette": {
        "wl": "E8E2B4", "a": "FAF3D3", "sc": "FBE0CE", "ce": "D7E7CF",
        "en": "E6EEF9", "ma": "EEF0DA", "so": "E0CFB6",
        "tblock": "E2E2F0", "lunch": "EFEFEF", "free": "F7F7F7",
    },
    "courses": {
        "A": [dict(term="FY", code="WL1000-01", title="SPANISH 2",
                   teacher="Adams", room="101", color="a", only=[2, 4])],
        "B": [dict(term="FY", code="EN1000-01", title="ENGLISH 9",
                   teacher="Brooks", room="102", color="en")],
        "C": [dict(term="FY", code="VA1000-01", title="STUDIO ART",
                   teacher="Chen", room="103", color="ce")],
        "D": [dict(term="FY", code="SC1000-01", title="BIOLOGY",
                   teacher="Diaz", room="104", color="sc")],
        "E": [dict(term="FY", code="SO1010-01", title="CIVICS",
                   teacher="Ellis", room="105", color="so")],
        "F": [dict(term="FY", code="MA1000-01", title="ALGEBRA 1",
                   teacher="Ford", room="106", color="ma")],
        "G": [dict(term="FY", code="SO1000-01", title="US HISTORY",
                   teacher="Gray", room="107", color="so")],
        "T": [dict(term="FY", code="HR1000-01", title="ADVISORY",
                   teacher="Hall", room="108", color="tblock")],
    },
}

# Extra sections for the key tab: (heading, [lines]). Heading may be None.
NOTES = [
    ("ABOUT THIS EXAMPLE", [
        "These courses are invented. Replace them with a schedule read from Aspen.",
        "Spanish 2 is set to meet only its A2 and A4 sessions, so 1st period is free on",
        "Days 1 and 5 and the planner gives a later arrival time on those days.",
        "Civics is a Social Studies course, so 3rd period on Day 1 takes Lunch 1 first",
        "while every other day takes Lunch 2. The planner works that out from the code.",
    ]),
]
