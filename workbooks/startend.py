# -*- coding: utf-8 -*-
"""SB's start-and-end calendar: two 45-minute family windows per school day."""
import sys, os, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planner as p, ics as I
D=dt.date

ABBR=[("Chemistry","Chem"),("Mathematics","Math"),("Algebra","Alg"),("History","Hist"),
      ("Literature","Lit"),("Physical Education","PE"),("Language","Lang"),("Social","Soc"),
      ("Justice","Justice"),("Medical","Med"),("International","Intl"),("Intrnl","Intl"),
      ("Advisory","Advisory"),("Production","Prod"),("Careers","Careers"),("Leadership","Lead"),
      ("Wrld","World"),("Hsty","Hist"),("Jstc","Justice")]
def short(name, cap=15):
    s=str(name)
    for a,b in ABBR: s=s.replace(a,b).replace(a.upper(),b).replace(a.lower(),b)
    s=" ".join(w for w in s.split() if w not in ("H","HN","Lead"))     # honors marker adds nothing
    if len(s)<=cap: return s
    out=[]
    for w in s.split():
        if len(" ".join(out+[w]))>cap: break
        out.append(w)
    return " ".join(out) if out else s[:cap]

def first_last(spec, dn, day):
    rows,g = I.day_rows(spec,dn,day)
    cls=[r for r in rows if not r[1].lower().startswith("lunch")]
    return (cls[0][1] if cls else ""), g

def hhmm(t):  # "9:37 AM" -> (9,37)
    t=t.strip().replace(" AM","").replace(" PM","")
    h,m=t.split(":"); h=int(h); m=int(m)
    if h<7: h+=12                      # afternoon times printed as 1:48 etc.
    return h,m
def shift(h,m,mins):
    x=dt.datetime(2000,1,1,h,m)+dt.timedelta(minutes=mins)
    return x.hour,x.minute
def fmt(h,m): return "%d:%02d"%(((h%12) or 12),m)

MORNING_BEFORE, MORNING_AFTER = 30, 15
EVENING_BEFORE, EVENING_AFTER = 15, 30
UNKNOWN_WINDOW = ((12,0),(13,0))       # for days whose real time is not published

def build(spec, label, salt, last_day, q3_days, out):
    evs=[]; d=I.RANGE_START
    while d<=last_day:
        if d.weekday()<5: evs.append(d)
        d+=dt.timedelta(days=1)
    lines=[]; rows_report=[]
    for day in evs:
        ds=day.strftime("%Y%m%d"); nxt=(day+dt.timedelta(days=1)).strftime("%Y%m%d")
        q3 = day in q3_days
        pre = "CONFIRM · " if q3 else ""
        def ev(key, st, en, title, note=""):
            lines.append(("BEGIN:VEVENT","UID:"+I.uid(salt,"w",ds,key),"DTSTAMP:20260914T000000Z",
              "DTSTART;TZID=America/New_York:%sT%02d%02d00"%(ds,st[0],st[1]),
              "DTEND;TZID=America/New_York:%sT%02d%02d00"%(ds,en[0],en[1]),
              "SUMMARY:"+I.esc(title),"DESCRIPTION:"+I.esc(note),
              "TRANSP:TRANSPARENT","END:VEVENT"))
        def allday(title):
            lines.append(("BEGIN:VEVENT","UID:"+I.uid(salt,"w",ds,"off"),"DTSTAMP:20260914T000000Z",
              "DTSTART;VALUE=DATE:"+ds,"DTEND;VALUE=DATE:"+nxt,
              "SUMMARY:"+I.esc(title),"TRANSP:TRANSPARENT","END:VEVENT"))

        if day in p.CLOSED:
            hd,why=p.CLOSED[day]; allday("NO SCHOOL · "+why); rows_report.append((day,"NO SCHOOL · "+why,"")); continue
        if day in p.SNOW_DAYS:
            allday("NO SCHOOL · snow make-up day (only if needed)"); continue
        if day in p.EXAM_DAYS or day in p.MCAS_DAYS:
            what = "exams" if day in p.EXAM_DAYS else "MCAS"
            a=shift(8,20,-MORNING_BEFORE); b=shift(8,20,MORNING_AFTER)
            ev("am",a,b,pre+"?%s — what time?"%what,"Times are not published. Check the schedule from school.")
            ev("pm",UNKNOWN_WINDOW[0],UNKNOWN_WINDOW[1],pre+"?%s — out when?"%what,
               "Times are not published. Check the schedule from school.")
            rows_report.append((day,pre+"?%s — what time?"%what, pre+"?%s — out when?"%what)); continue
        if day in p.SPECIAL:
            a=shift(8,20,-MORNING_BEFORE); b=shift(8,20,MORNING_AFTER)
            ev("am",a,b,pre+"1st class at 8:20","Special schedule — classes are shortened.")
            ev("pm",UNKNOWN_WINDOW[0],UNKNOWN_WINDOW[1],pre+"?early release when?",
               "Early release. Dismissal time is not published — check with school.")
            rows_report.append((day,pre+"1st class at 8:20",pre+"?early release when?")); continue
        if day not in p.DAYNUM: continue

        dn=p.DAYNUM[day]
        first,g = first_last(spec,dn,day)
        sh,sm = hhmm(g["arrival"])
        eh,em = hhmm(g["dismissal"].replace("  ** EARLY **",""))
        am_t = pre+"1st class %s at %s" % (short(first), fmt(sh,sm))
        pm_t = pre+"Out at %s" % fmt(eh,em)
        ev("am", shift(sh,sm,-MORNING_BEFORE), shift(sh,sm,MORNING_AFTER), am_t,
           "Day %d · first class %s at %s"%(dn,first,fmt(sh,sm)))
        ev("pm", shift(eh,em,-EVENING_BEFORE), shift(eh,em,EVENING_AFTER), pm_t,
           "Day %d · out at %s"%(dn,fmt(eh,em)))
        rows_report.append((day,am_t,pm_t))

    head=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//BHS Weekly Planner//EN","CALSCALE:GREGORIAN",
          "METHOD:PUBLISH","X-WR-CALNAME:"+I.esc(label+" · start and end"),
          "X-WR-TIMEZONE:America/New_York"]
    body=[]
    for e in lines: body+=list(e)
    txt="\r\n".join(I.fold(l) for l in head+I.VTIMEZONE.split("\n")+body+["END:VCALENDAR"])+"\r\n"
    open(out,"w",newline="").write(txt)
    return len(lines), rows_report
