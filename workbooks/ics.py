# -*- coding: utf-8 -*-
"""Build two .ics calendars per student: all-day school days, and timed classes.
   No teacher names. Room numbers appear bare, with no 'Rm' label."""
import sys, os, datetime as dt, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planner as p
D = dt.date

RANGE_START = D(2026,9,14)
Q3_NOTE = "CONFIRM CHANGES, then re-run this calendar for the new term"
PERIOD_TIMES = {            # (start, end) for each printed row
 "p1":  ((8,20),(9,30)),
 "p2":  ((9,37),(10,47)),
 "p4":  ((12,38),(13,48)),
 "p5":  ((13,55),(15,5)),
}
LUNCH1 = ((10,49),(11,19)); CLASS1 = ((10,54),(12,4))
LUNCH2 = ((12,6),(12,36));  CLASS2 = ((11,21),(12,31))
T1 = ((13,55),(14,25)); T2 = ((13,55),(14,15))

def esc(s):
    return (str(s).replace("\\","\\\\").replace(";","\;").replace(",","\\,")
            .replace("\n","\\n"))
def fold(line):
    b=line.encode("utf-8")
    if len(b)<=73: return line
    out=[]; cur=b""
    for ch in line:
        e=ch.encode("utf-8")
        if len(cur)+len(e)>73: out.append(cur.decode("utf-8")); cur=b" "
        cur+=e
    out.append(cur.decode("utf-8"))
    return "\r\n".join(out)
def uid(salt, *parts):
    h=hashlib.sha1(("|".join([salt]+[str(x) for x in parts])).encode()).hexdigest()[:20]
    return h+"@bhs-planner"

VTIMEZONE = """BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE"""

ROMAN={"I","II","III","IV","V","VI","VII","VIII","IX","X"}
def nicecase(t):
    """Title-case a course name without wrecking 'II', 'H', or codes like 'SO15'."""
    out=[]
    for w in str(t).split():
        u=w.upper()
        if u in ROMAN or len(w)<=1 or any(ch.isdigit() for ch in w): out.append(u if w.isupper() else w)
        elif w.isupper(): out.append(w.capitalize())
        else: out.append(w)
    return " ".join(out)

PKEY={"p1":1,"p2":2,"p3a":3,"p3b":3,"p4":4,"p5":5}

def day_rows(spec, dn, day):
    """[(key, name, room, blockcode, (start,end))] in printed order, classes and lunch."""
    g=p.resolve_day(spec,dn,day); out=[]
    for key in ("p1","p2","p3a","p3b","p4","p5"):
        title,body,ck = g[key]
        if ck=="free": continue
        block = p.BLOCKMAP.get((dn, PKEY[key]), "") or ""
        is_lunch = title.upper().startswith("LUNCH")
        if key=="p3a":   span = LUNCH1 if is_lunch else CLASS1
        elif key=="p3b": span = LUNCH2 if is_lunch else CLASS2
        elif key=="p5" and block=="T1": span=T1
        elif key=="p5" and block=="T2": span=T2
        else: span=PERIOD_TIMES[key]
        course = None if is_lunch else p.course_for(spec, block[0], day) if block else None
        room = (course or {}).get("room") or ""
        name = ("Lunch "+title.split()[-1]) if is_lunch else nicecase(title)
        out.append((key, name, str(room), block, span))
    return out, g


def build(spec, label, salt, last_day, q3_days, out_prefix):
    days=[]
    d=RANGE_START
    while d<=last_day:
        if d.weekday()<5: days.append(d)
        d+=dt.timedelta(days=1)

    school=[]; odd=[]; classes=[]
    for day in days:
        ds=day.strftime("%Y%m%d"); nxt=(day+dt.timedelta(days=1)).strftime("%Y%m%d")
        q3 = day in q3_days
        alarm=False; title=None; desc=[]

        kind="regular"
        if day in p.CLOSED:
            hd,why = p.CLOSED[day]; title = "NO SCHOOL · "+why; kind="off"
        elif day in p.SNOW_DAYS:
            title = "SNOW MAKE-UP DAY (only if needed)"; kind="off"
        elif day in p.EXAM_DAYS:
            title = p.EXAM_DAYS[day].upper()+" · see exam schedule"; kind="odd"
        elif day in p.MCAS_DAYS:
            title = "MCAS TESTING · see MCAS schedule"; kind="odd"
        elif day in p.SPECIAL:
            ban,dis,note = p.SPECIAL[day]
            title = "EARLY RELEASE · "+("dismissed "+dis if dis[0].isdigit() else "time not published")
            kind="odd"
        elif day in p.DAYNUM:
            dn=p.DAYNUM[day]
            rows,g = day_rows(spec,dn,day)
            arr=g["arrival"].replace(" AM","").replace(" PM","")
            dis=g["dismissal"].replace("  ** EARLY **","").replace(" AM","").replace(" PM","")
            left  = ("LATE START "+arr) if g["late"] else arr
            right = ("EARLY OUT "+dis) if g["early"] else dis
            title = "%s \u2192 %s · Day %d" % (left, right, dn)
            if g["late"] or g["early"]: kind="odd"
            for key,name,room,block,span in rows:
                desc.append(("%02d:%02d  %s" % (span[0][0],span[0][1], name)) + ((" · "+room) if room else ""))
                st,en=span
                classes.append((
                  "BEGIN:VEVENT",
                  "UID:"+uid(salt,"c",ds,key),
                  "DTSTAMP:20260914T000000Z",
                  "DTSTART;TZID=America/New_York:%sT%02d%02d00"%(ds,st[0],st[1]),
                  "DTEND;TZID=America/New_York:%sT%02d%02d00"%(ds,en[0],en[1]),
                  "SUMMARY:"+esc(name+((" · "+room) if room else "")),
                  "DESCRIPTION:"+esc(((block[0]+" Block  ·  "+block) if block else "")+
                      ("  ·  "+Q3_NOTE if q3 else "")),
                  "TRANSP:TRANSPARENT","END:VEVENT"))
        else:
            continue

        if q3:
            title = "CONFIRM · "+title; kind="odd"
            desc.append(""); desc.append(Q3_NOTE); alarm=True
        ev=["BEGIN:VEVENT","UID:"+uid(salt,"s",ds),"DTSTAMP:20260914T000000Z",
            "DTSTART;VALUE=DATE:"+ds,"DTEND;VALUE=DATE:"+nxt,
            "SUMMARY:"+esc(title),"TRANSP:TRANSPARENT"]
        if desc: ev.append("DESCRIPTION:"+esc("\n".join(desc)))
        ev.append("END:VEVENT")
        (odd if kind=="odd" else school).append(tuple(ev))

    def wrap(name, events):
        head=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//BHS Weekly Planner//EN",
              "CALSCALE:GREGORIAN","METHOD:PUBLISH",
              "X-WR-CALNAME:"+esc(name),"X-WR-TIMEZONE:America/New_York"]
        body=[]; 
        for e in events: body += list(e)
        lines = head + VTIMEZONE.split("\n") + body + ["END:VCALENDAR"]
        return "\r\n".join(fold(l) for l in lines)+"\r\n"

    files=[("1-regular-days",  label+" · regular days",     school),
           ("2-late-and-early", label+" · LATE / EARLY days", odd),
           ("3-classes",        label+" · classes",           classes)]
    out=[]
    for suffix,name,events in files:
        fn="%s-%s.ics"%(out_prefix,suffix)
        open(fn,"w",newline="").write(wrap(name, events))
        out.append((fn,len(events)))
    return out
