# -*- coding: utf-8 -*-
"""Regenerate src/district_data.json from workbooks/planner.py.

Run this after changing any calendar data, then run assemble.py. Keeping one
source means the web tool and the workbook generator cannot drift apart.
"""
import sys, os, json, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "workbooks"))
import planner as p
def k(d): return d.isoformat()
special={k(d):{"banner":v[0],"dismissal":v[1],"note":v[2]} for d,v in p.SPECIAL.items()}
closed={k(d):{"banner":v[0],"why":v[1]} for d,v in p.CLOSED.items()}
data={
 "year":"2026/27",
 "dayNum":{k(d):n for d,n in p.DAYNUM.items()},
 "closed":closed, "special":special,
 "exams":{k(d):v for d,v in p.EXAM_DAYS.items()},
 "mcas":[k(d) for d in sorted(p.MCAS_DAYS)],
 "snow":[k(d) for d in sorted(p.SNOW_DAYS)],
 "lastDay":k(p.LAST_DAY),
 "events":{k(d):v for d,v in p.EVENTS.items()},
 "sem2Start":k(p.SEM2_START),
 "blockMap":{"%d-%d"%(d,per):code for (d,per),code in p.BLOCKMAP.items()},
 "mcasS1":p.MCAS_S1, "mcasS2":p.MCAS_S2,
 "class1Lunch2":sorted(p.CLASS1_LUNCH2),
 "firstMonday":k(p.mondays()[0]), "lastMonday":k(p.mondays()[-1]),
 "periodTimes":{"1":"8:20 - 9:30","2":"9:37 - 10:47","4":"12:38 - 1:48","5":"1:55 - 3:05"},
}
OUT = os.path.join(HERE, "district_data.json")
json.dump(data, open(OUT, "w"), separators=(",", ":"))
print("rotation days",len(data["dayNum"]),"| closed",len(data["closed"]),
      "| exams",len(data["exams"]),"| mcas",len(data["mcas"]),
      "| bytes",len(open(OUT).read()))
