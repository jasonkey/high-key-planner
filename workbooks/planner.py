# -*- coding: utf-8 -*-
"""BHS weekly planner engine — full year 2026/27.
Data source: 'Brookline High School - School Year Calendar for 2026/2027' (rotation days,
closures, quarter ends, exams, MCAS) + the district's per-block Google calendars (bell times,
block-to-period map) + each student's Aspen course list (courses, terms, teachers)."""
import datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
D = dt.date

# ---------------- rotation days, full year ----------------
_YC = {
 (2026,9):  [(8,1),(9,2),(10,3),(11,4),(14,5),(15,6),(16,1),(17,2),(18,3),(22,4),(23,5),(24,6),
             (25,1),(28,2),(29,3),(30,4)],
 (2026,10): [(1,5),(2,6),(5,1),(6,2),(7,3),(8,4),(9,5),(13,6),(14,1),(15,2),(16,3),(19,4),(20,5),
             (21,6),(22,1),(23,2),(26,3),(27,4),(28,5),(29,6),(30,1)],
 (2026,11): [(2,2),(4,3),(5,4),(6,5),(9,6),(10,1),(12,2),(13,3),(16,4),(17,5),(18,6),(19,1),(20,2),
             (23,3),(24,4),(30,5)],
 (2026,12): [(1,6),(2,1),(4,2),(7,3),(8,4),(9,5),(10,6),(11,1),(14,2),(15,3),(16,4),(17,5),(18,6),
             (21,1),(22,2),(23,3)],
 (2027,1):  [(4,4),(5,5),(6,6),(7,1),(8,2),(11,3),(12,4),(13,5),(14,6),(15,1),(19,2),(20,3),(21,4),
             (22,5),(25,6),(29,1)],
 (2027,2):  [(1,2),(2,3),(3,4),(4,5),(5,6),(8,1),(9,2),(10,3),(11,4),(12,5),(22,6),(23,1),(24,2),
             (25,3),(26,4)],
 (2027,3):  [(1,5),(2,6),(3,1),(4,2),(5,3),(8,4),(10,5),(11,6),(12,1),(15,2),(16,3),(17,4),(18,5),
             (19,6),(22,1),(25,2),(29,3),(30,4),(31,5)],
 (2027,4):  [(1,6),(2,1),(5,2),(6,3),(7,4),(9,5),(12,6),(13,1),(14,2),(15,3),(16,4),(26,5),(27,6),
             (28,1),(29,2),(30,3)],
 (2027,5):  [(3,4),(4,5),(5,6),(6,1),(7,2),(10,3),(11,4),(12,5),(13,6),(14,1),(17,2),(20,3),(21,4),
             (24,5),(25,6),(26,1),(27,2),(28,3)],
 (2027,6):  [(3,4),(4,5),(7,6),(8,1),(9,2),(10,3),(11,4),(14,5),(15,6)],
}
DAYNUM = {D(y,m,d): n for (y,m), rows in _YC.items() for d, n in rows}

def _span(y1,m1,d1,y2,m2,d2,label,kind="NO SCHOOL"):
    a,b = D(y1,m1,d1), D(y2,m2,d2); out={}
    while a<=b:
        out[a]=(kind,label); a+=dt.timedelta(days=1)
    return out

CLOSED = {}
CLOSED[D(2026,9,21)]  = ("SCHOOL CLOSED","Yom Kippur")
CLOSED[D(2026,10,12)] = ("SCHOOL CLOSED","Indigenous Peoples' Day")
CLOSED[D(2026,11,3)]  = ("SCHOOL CLOSED","Professional Dev. Day")
CLOSED[D(2026,11,11)] = ("SCHOOL CLOSED","Veterans Day")
CLOSED.update(_span(2026,11,26,2026,11,27,"Thanksgiving Break"))
CLOSED.update(_span(2026,12,24,2027,1,1,"Winter Break"))
CLOSED[D(2027,1,18)]  = ("NO SCHOOL","Martin Luther King Jr. Day")
CLOSED.update(_span(2027,2,15,2027,2,19,"February Break"))
CLOSED[D(2027,3,9)]   = ("NO SCHOOL","No school")
CLOSED[D(2027,3,26)]  = ("NO SCHOOL","No school")
CLOSED.update(_span(2027,4,19,2027,4,23,"April Break"))
CLOSED[D(2027,5,31)]  = ("NO SCHOOL","Memorial Day")

SPECIAL = {
 D(2026,11,25): ("SPECIAL SCHEDULE","Early (time not published)","Special Schedule / Early Release"),
 D(2026,12,3):  ("SPECIAL SCHEDULE","12:40 PM","Early Release — PK-12 dismissed 12:40 PM"),
 D(2027,4,8):   ("SPECIAL SCHEDULE","Early (time not published)","Special Schedule / Early Release"),
}
EXAM_DAYS = {D(2027,1,26):"MIDTERM EXAMS", D(2027,1,27):"MIDTERM EXAMS", D(2027,1,28):"MIDTERM EXAMS",
             D(2027,6,16):"FINAL EXAMS",   D(2027,6,17):"FINAL EXAMS",   D(2027,6,18):"FINAL EXAMS"}
MCAS_DAYS = {D(2027,3,23),D(2027,3,24),D(2027,5,18),D(2027,5,19),D(2027,6,1),D(2027,6,2)}
LAST_DAY  = D(2027,6,21)
SNOW_DAYS = {D(2027,6,22),D(2027,6,23),D(2027,6,24),D(2027,6,25),D(2027,6,28)}
# MCAS-day structure, printed on the year calendar
MCAS_S1, MCAS_S2 = ["A","C","E","T"], ["B","D","F","G"]

PROGRESS = {D(2026,10,7), D(2026,12,15), D(2027,3,8), D(2027,5,18)}

EVENTS = {
 D(2026,10,1):  "Back to School Night 6:00-9:00 PM (parents)",
 D(2026,10,7):  "Progress reports posted in Aspen",
 D(2026,12,15): "Progress reports posted in Aspen",
 D(2027,3,8):   "Progress reports posted in Aspen",
 D(2027,5,18):  "Progress reports posted in Aspen",
 D(2026,10,9):  "PICTURE DAY",
 D(2026,11,9):  "** QUARTER 1 ENDS **",
 D(2027,1,28):  "** QUARTER 2 + SEMESTER 1 END **",
 D(2027,1,29):  "Semester 2 begins",
 D(2027,4,12):  "** QUARTER 3 ENDS **",
 D(2027,6,21):  "** LAST DAY OF SCHOOL — QUARTER 4 ENDS **",
}
SEM2_START = D(2027,1,29)

# ---------------- school-wide block map ----------------
BLOCKMAP = {
 (1,1):"A1",(3,1):"A2",(5,1):"A3",(6,2):"A4",
 (2,1):"B1",(3,2):"B2",(4,1):"B3",(6,1):"B4",
 (2,2):"C1",(3,3):"C2",(5,2):"C3",(6,3):"C4",
 (1,2):"D1",(2,3):"D2",(4,2):"D3",(5,3):"D4",
 (1,3):"E1",(2,4):"E2",(4,4):"E3",(6,4):"E4",
 (1,4):"F1",(2,5):"F2",(4,3):"F3",(5,5):"F4",
 (1,5):"G1",(3,4):"G2",(4,5):"G3",(5,4):"G4",
 (3,5):"T1",(6,5):"T2",
}
CLASS1_LUNCH2 = {"CE","FP","TE","MA","PA","SC","VA","WE"}

# Terms a weekly page can actually place. BHS also runs courses shorter than a
# semester — the ACE program's are trimester-length, six weeks each — and Aspen
# labels those with terms resolve_day cannot put on a date. Such a course is
# reported rather than dropped in silence. Mirrored in app.js PLACEABLE_TERMS.
PLACEABLE_TERMS = ("FY", "S1", "S2")

# ---------------- styling ----------------
FONT="Arial"
thin=Side(style="thin",color="B7B7B7"); med=Side(style="medium",color="595959"); hair=Side(style="hair",color="CCCCCC")
box=Border(left=thin,right=thin,top=thin,bottom=thin)
def F(sz=10,b=False,c="000000",i=False): return Font(name=FONT,size=sz,bold=b,color=c,italic=i)
def fill(h): return PatternFill("solid",fgColor=h)
CEN=Alignment(horizontal="center",vertical="center",wrap_text=True)
LEFT=Alignment(horizontal="left",vertical="center",wrap_text=True)
DARK="2F3E52"; ACCENT="44607F"; GREY="F2F2F2"; CLOSEDF="D9D9D9"; EVENTF="FFF2CC"
LATEF="FFE2E8"; EARLYF="FCE4D6"; EXAMF="F3E8EF"; EXAMC="7B4B6B"; MCASF="E4EEF6"

R_TITLE,R_DAY,R_NUM,R_EVT,R_ARR,R_Z,R_P1,R_P2,R_P3A,R_P3B,R_P4,R_P5,R_DIS,R_AFT = range(1,15)
def evening_rows(note=None):
    """Hourly write-in rows 3 PM - 10 PM, plus one optional recurring note row."""
    hours=["3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"]
    labels=[]
    for h in hours:
        labels.append((h,False))
        if note and note[0].startswith(h.split(":")[0]+":"): labels.append((note[1]+"  "+note[0],True))
    return [(lab,15+i,flag) for i,(lab,flag) in enumerate(labels)]
EVE=[(l,r) for l,r,_ in evening_rows()]
LAST_ROW=22
LABELS={R_ARR:"ARRIVAL",R_Z:"Z Block  (free)",R_P1:"1st Period",R_P2:"2nd Period",
        R_P3A:"3rd Period\n1st half",R_P3B:"3rd Period\n2nd half",R_P4:"4th Period",
        R_P5:"5th Period",R_DIS:"DISMISSAL"}
TIMES={R_Z:"7:30 - 8:15\n(no class)",R_P1:"8:20 - 9:30",R_P2:"9:37 - 10:47",
       R_P3A:"Lunch 1: 10:49-11:19\nClass 1: 10:54-12:04",
       R_P3B:"Class 2: 11:21-12:31\nLunch 2: 12:06-12:36",
       R_P4:"12:38 - 1:48",R_P5:"1:55 - 3:05",R_DIS:"3:05 PM\n(2:15 PM on Day 6)"}
H={R_TITLE:26,R_DAY:22,R_NUM:26,R_EVT:24,R_ARR:28,R_Z:17,R_P1:42,R_P2:42,
   R_P3A:54,R_P3B:54,R_P4:42,R_P5:54,R_DIS:24,R_AFT:16}
for _l,_r in EVE: H[_r]=26
for _extra in range(15,26): H.setdefault(_extra,26)

# ---------------- schedule resolution ----------------
def course_for(spec, letter, day):
    """The course in this block on this date, honouring S1 / S2 / FY terms."""
    entries = spec["courses"].get(letter)
    if not entries: return None
    if isinstance(entries, dict): entries=[entries]
    sem = "S2" if (day and day>=SEM2_START) else "S1"
    for c in entries:
        if c.get("term","FY") in ("FY", sem): return c
    return None

def unplaceable_courses(spec):
    """[(block letter, course)] whose term resolve_day cannot place on a date."""
    out=[]
    for letter, entries in spec.get("courses",{}).items():
        if isinstance(entries, dict): entries=[entries]
        for c in entries:
            if str(c.get("term","FY")).upper() not in PLACEABLE_TERMS:
                out.append((letter,c))
    return out

def unplaceable_lines(spec):
    """Warning lines for the KEY tab and the console. Empty when all is well."""
    bad=unplaceable_courses(spec)
    if not bad: return []
    lines=["The planner places full-year and semester courses (FY, S1, S2).",
           "These carry a different term, so they are NOT on the weekly pages —",
           "write them in by hand:"]
    for letter,c in bad:
        lines.append("    %s block - %s (%s, term %s)" % (
            letter, c.get("title","?"), c.get("code","?"), c.get("term","?")))
    return lines

def _who(c):
    bits=[]
    if c.get("teacher"): bits.append(c["teacher"])
    bits.append(("Rm %s"%c["room"]) if c.get("room") else "room TBD")
    return "  ·  ".join(bits)

def resolve_day(spec, dn, day=None):
    out={}; slots={}
    for pnum in (1,2,3,4,5):
        bs=BLOCKMAP.get((dn,pnum))
        if not bs: slots[pnum]=("NONE",None,None); continue
        letter,num=bs[0],int(bs[1])
        c=course_for(spec,letter,day)
        if c is None or (c.get("only") and num not in c["only"]): slots[pnum]=("FREE",bs,None)
        else: slots[pnum]=("CLASS",bs,c)
    for pnum,key in ((1,"p1"),(2,"p2"),(4,"p4")):
        st,bs,c=slots[pnum]
        if st=="FREE":
            out[key]=("FREE — no class","%s block does not meet\nfor her"%bs[0],"free")
        else:
            out[key]=(c["title"],"%s\n%s Block  ·  %s"%(_who(c),bs[0],bs),c["color"])
    st,bs,c=slots[3]
    if st=="FREE":
        out["p3a"]=("LUNCH 1","10:49 - 11:19","lunch"); out["p3b"]=("FREE — no class","11:21 - 12:31","free")
    else:
        body="%s\n%s Block  ·  %s"%(_who(c),bs[0],bs)
        if c["code"][:2].upper() in CLASS1_LUNCH2:
            out["p3a"]=(c["title"],body+"\nClass 1  ·  10:54-12:04",c["color"]); out["p3b"]=("LUNCH 2","12:06 - 12:36","lunch")
        else:
            out["p3a"]=("LUNCH 1","10:49 - 11:19","lunch"); out["p3b"]=(c["title"],body+"\nClass 2  ·  11:21-12:31",c["color"])
    st,bs,c=slots[5]
    if bs in ("T1","T2"):
        tc=course_for(spec,"T",day)
        nm=tc["title"] if tc else "T BLOCK"; rm=(_who(tc)+"\n") if tc else ""
        if bs=="T1":
            out["p5"]=(nm,rm+"T1  ·  1:55 - 2:25\nthen X Block to 3:05","tblock"); out["dis"]=("3:05 PM",False)
        else:
            out["p5"]=(nm,rm+"T2  ·  1:55 - 2:15\nEARLY DISMISSAL","tblock"); out["dis"]=("2:15 PM  ** EARLY **",True)
    elif st=="FREE":
        out["p5"]=("FREE — no class","1:55 - 3:05","free")
    else:
        out["p5"]=(c["title"],"%s\n%s Block  ·  %s"%(_who(c),bs[0],bs),c["color"])
    if   slots[1][0]=="CLASS": out["arrival"],out["late"]="8:20 AM",False
    elif slots[2][0]=="CLASS": out["arrival"],out["late"]="9:37 AM",True
    elif slots[3][0]=="CLASS": out["arrival"],out["late"]="10:49 AM",True
    else:                      out["arrival"],out["late"]="12:38 PM",True
    if "dis" in out: out["dismissal"],out["early"]=out.pop("dis")
    elif slots[5][0]=="FREE":  out["dismissal"],out["early"]="1:48 PM  ** EARLY **",True
    else:                      out["dismissal"],out["early"]="3:05 PM",False
    return out

def mcas_lists(spec, day):
    def names(letters):
        got=[]
        for L in letters:
            c=course_for(spec,L,day)
            if c: got.append(c["title"].title())
        return ", ".join(got) if got else "—"
    return names(MCAS_S1), names(MCAS_S2)

def mondays():
    out=[]; m=D(2026,9,14)
    while m<=D(2027,6,21): out.append(m); m+=dt.timedelta(days=7)
    return out

# ---------------- weekly sheet ----------------
def build_week(wb, monday, spec, subtitle):
    EVE=[(l,r,f) for l,r,f in evening_rows((spec or {}).get("evening_note"))]
    LAST=EVE[-1][1]
    days=[monday+dt.timedelta(days=i) for i in range(5)]
    ws=wb.create_sheet(monday.strftime("%b %-d"))
    ws.sheet_view.showGridLines=False
    ws.column_dimensions["A"].width=15
    for i in range(5): ws.column_dimensions[get_column_letter(2+i)].width=25
    ws.column_dimensions["G"].width=19
    for r,h in H.items(): ws.row_dimensions[r].height=h

    ws.merge_cells(start_row=1,start_column=1,end_row=1,end_column=7)
    c=ws.cell(1,1,"%s   ·   Week of %s"%(subtitle,monday.strftime("%B %-d, %Y")))
    c.font=F(14,True,"FFFFFF"); c.fill=fill(DARK); c.alignment=CEN

    ws.cell(R_DAY,1,"").fill=fill(ACCENT)
    x=ws.cell(R_NUM,1,"ROTATION DAY"); x.font=F(9,True,"FFFFFF"); x.fill=fill(ACCENT); x.alignment=CEN
    x=ws.cell(R_EVT,1,"SCHOOL NOTES"); x.font=F(9,True); x.fill=fill(GREY); x.alignment=CEN
    for r,t in LABELS.items():
        cc=ws.cell(r,1,t); cc.font=F(9,r in (R_ARR,R_DIS)); cc.alignment=CEN
        cc.fill=fill("E8EDF2" if r in (R_ARR,R_DIS) else "FFFFFF")
    ws.merge_cells(start_row=R_AFT,start_column=1,end_row=R_AFT,end_column=7)
    a=ws.cell(R_AFT,1,"AFTER SCHOOL  →  10:00 PM          (write in activities, appointments, plans, cooking duty, homework)")
    a.font=F(9,True,"FFFFFF"); a.fill=fill(ACCENT); a.alignment=LEFT
    for t,r,flag in EVE:
        cc=ws.cell(r,1,t); cc.font=F(9,flag); cc.alignment=CEN
        cc.fill=fill(EVENTF if flag else "FFFFFF")

    t=ws.cell(R_DAY,7,"TIMES"); t.font=F(9,True,"FFFFFF"); t.fill=fill(ACCENT); t.alignment=CEN
    ws.cell(R_NUM,7,"").fill=fill(ACCENT); ws.cell(R_EVT,7,"").fill=fill(GREY)
    ar=ws.cell(R_ARR,7,"1st period 8:20\n2nd period 9:37"); ar.font=F(8,True,"1F3864"); ar.alignment=CEN; ar.fill=fill("E8EDF2")
    for r,txt in TIMES.items():
        cc=ws.cell(r,7,txt); cc.font=F(8,r==R_DIS,"1F3864"); cc.alignment=CEN
        cc.fill=fill("E8EDF2" if r==R_DIS else "FFFFFF")
    for t_,r,flag in EVE:
        cc=ws.cell(r,7,t_); cc.font=F(8,flag,"1F3864"); cc.alignment=CEN
        cc.fill=fill(EVENTF if flag else "FFFFFF")

    PAL=dict((spec or {}).get("palette",{}))
    PAL.setdefault("lunch","EFEFEF"); PAL.setdefault("free","F7F7F7"); PAL.setdefault("tblock","E2E2F0")
    CLASSROWS=[R_ARR,R_Z,R_P1,R_P2,R_P3A,R_P3B,R_P4,R_P5,R_DIS]

    def flat(col, bg, banner, sub, note=""):
        n=ws.cell(R_NUM,col,banner); n.font=F(11,True,"FFFFFF" if bg==DARK else "7F2A2A")
        n.fill=fill(bg if bg!=DARK else DARK); n.alignment=CEN
        e=ws.cell(R_EVT,col,note or sub); e.font=F(9,True,"7F2A2A"); e.fill=fill(bg); e.alignment=CEN
        for r in CLASSROWS:
            cc=ws.cell(r,col,sub if r==R_P2 else ""); cc.fill=fill(bg)
            cc.font=F(10,True,"7F7F7F"); cc.alignment=CEN

    for i,day in enumerate(days):
        col=2+i
        h=ws.cell(R_DAY,col,day.strftime("%A").upper()+"   "+day.strftime("%-m/%-d"))
        h.font=F(11,True,"FFFFFF"); h.fill=fill(ACCENT); h.alignment=CEN
        ev=EVENTS.get(day,"")

        if day in CLOSED:
            hd,nm=CLOSED[day]; flat(col,CLOSEDF,hd,"— no school —",nm)
        elif day in SNOW_DAYS:
            flat(col,CLOSEDF,"SNOW MAKE-UP","only if snow days were used","Reserved snow make-up day")
        elif day==LAST_DAY:
            n=ws.cell(R_NUM,col,"LAST DAY"); n.font=F(11,True,"FFFFFF"); n.fill=fill("7F2A2A"); n.alignment=CEN
            e=ws.cell(R_EVT,col,ev); e.font=F(8,True,"7F4F00"); e.fill=fill(EVENTF); e.alignment=CEN
            for r in [R_ARR,R_Z,R_P1,R_P3A,R_P3B,R_P4,R_P5,R_DIS]:
                cc=ws.cell(r,col,""); cc.fill=fill("FDECEC"); cc.alignment=CEN
            cc=ws.cell(R_P2,col,"Last day of school\nSchedule not published"); cc.fill=fill("FDECEC")
            cc.font=F(9,True,"7F2A2A"); cc.alignment=CEN
        elif day in EXAM_DAYS:
            lbl=EXAM_DAYS[day]
            n=ws.cell(R_NUM,col,lbl); n.font=F(11,True,"FFFFFF"); n.fill=fill(EXAMC); n.alignment=CEN
            e=ws.cell(R_EVT,col,ev); e.font=F(8,True,"7F4F00"); e.fill=fill(EVENTF if ev else GREY); e.alignment=CEN
            aa=ws.cell(R_ARR,col,"see exam\nschedule"); aa.font=F(9,True,EXAMC); aa.fill=fill(EXAMF); aa.alignment=CEN
            ws.cell(R_Z,col,"").fill=fill(EXAMF)
            for r in (R_P1,R_P2,R_P3A,R_P3B,R_P4,R_P5):
                cc=ws.cell(r,col,"Exam schedule not published —\nwrite in each exam and its time" if r==R_P2 else "")
                cc.fill=fill(EXAMF if r==R_P2 else "FFFFFF"); cc.font=F(8,False,EXAMC,True); cc.alignment=CEN
            d=ws.cell(R_DIS,col,"see exam\nschedule"); d.font=F(9,True,EXAMC); d.fill=fill(EXAMF); d.alignment=CEN
        elif day in MCAS_DAYS:
            n=ws.cell(R_NUM,col,"MCAS TESTING"); n.font=F(11,True,"FFFFFF"); n.fill=fill("3F6E8C"); n.alignment=CEN
            _n=" · ".join(x for x in ("Grade 10 MCAS", ev) if x)
            e=ws.cell(R_EVT,col,_n); e.font=F(8,True,"1F3864"); e.fill=fill(EVENTF if ev else MCASF); e.alignment=CEN
            aa=ws.cell(R_ARR,col,"see MCAS\nschedule"); aa.font=F(9,True,"1F3864"); aa.fill=fill(MCASF); aa.alignment=CEN
            ws.cell(R_Z,col,"").fill=fill(MCASF)
            s1,s2=mcas_lists(spec,day) if spec else ("A, C, E, T blocks","B, D, F, G blocks")
            for r in (R_P1,R_P2,R_P3A,R_P3B,R_P4,R_P5): ws.cell(r,col,"").fill=fill("FFFFFF")
            cc=ws.cell(R_P2,col,"SESSION 1\n"+s1); cc.font=F(9,True,"1F3864"); cc.fill=fill(MCASF); cc.alignment=CEN
            cc=ws.cell(R_P4,col,"SESSION 2\n"+s2); cc.font=F(9,True,"1F3864"); cc.fill=fill(MCASF); cc.alignment=CEN
            cc=ws.cell(R_P3A,col,"times not published"); cc.font=F(8,False,"7F7F7F",True); cc.alignment=CEN
            d=ws.cell(R_DIS,col,"see MCAS\nschedule"); d.font=F(9,True,"1F3864"); d.fill=fill(MCASF); d.alignment=CEN
        elif day in SPECIAL:
            ban,dis,note=SPECIAL[day]
            n=ws.cell(R_NUM,col,ban); n.font=F(11,True,"7F4F00"); n.fill=fill(EARLYF); n.alignment=CEN
            e=ws.cell(R_EVT,col,note); e.font=F(8,True,"7F4F00"); e.fill=fill(EVENTF); e.alignment=CEN
            aa=ws.cell(R_ARR,col,"8:20 AM"); aa.font=F(12,True); aa.fill=fill("E8EDF2"); aa.alignment=CEN
            zz=ws.cell(R_Z,col,"free"); zz.font=F(8,False,"7F7F7F"); zz.alignment=CEN
            for r in (R_P1,R_P2,R_P3A,R_P3B,R_P4,R_P5):
                cc=ws.cell(r,col,"Special schedule —\nclasses shortened" if r==R_P2 else "")
                cc.fill=fill(EARLYF); cc.font=F(9,False,"7F4F00"); cc.alignment=CEN
            d=ws.cell(R_DIS,col,dis); d.font=F(11,True,"7F2A2A"); d.fill=fill(EARLYF); d.alignment=CEN
        elif day in DAYNUM:
            dn=DAYNUM[day]
            n=ws.cell(R_NUM,col,"DAY %d"%dn); n.font=F(13,True,"FFFFFF"); n.fill=fill(DARK); n.alignment=CEN
            e=ws.cell(R_EVT,col,ev); e.font=F(9,True,"7F4F00"); e.alignment=CEN
            e.fill=fill(EVENTF if ev else GREY)
            zz=ws.cell(R_Z,col,"free — no class"); zz.font=F(8,False,"7F7F7F"); zz.alignment=CEN
            if spec is None:
                ws.cell(R_ARR,col,"").fill=fill("E8EDF2")
                for r,pn in ((R_P1,1),(R_P2,2),(R_P3A,3),(R_P4,4),(R_P5,5)):
                    bs=BLOCKMAP.get((dn,pn))
                    if not bs: continue
                    if bs=="T1":   v,fo,fi="T1  ·  1:55 - 2:25\nthen X Block to 3:05",F(9,True,"4A4A72"),"E2E2F0"
                    elif bs=="T2": v,fo,fi="T2  ·  1:55 - 2:15\nEARLY DISMISSAL",F(9,True,"4A4A72"),"E2E2F0"
                    elif pn==3:    v,fo,fi=bs[0]+" Block  ·  "+bs+"\n(and Lunch 1 or 2)",F(9,False,"A6A6A6"),"FFFFFF"
                    else:          v,fo,fi=bs[0]+" Block  ·  "+bs,F(9,False,"A6A6A6"),"FFFFFF"
                    cc=ws.cell(r,col,v); cc.font=fo; cc.fill=fill(fi); cc.alignment=CEN
                ws.cell(R_P3B,col,"").fill=fill("FFFFFF")
                dv="2:15 PM  ** EARLY **" if dn==6 else "3:05 PM"
                d=ws.cell(R_DIS,col,dv); d.font=F(11,True,"7F2A2A" if dn==6 else "1F3864")
                d.fill=fill(EARLYF if dn==6 else "E8EDF2"); d.alignment=CEN
            else:
                g=resolve_day(spec,dn,day)
                aa=ws.cell(R_ARR,col,g["arrival"]+("\n** LATE START **" if g["late"] else ""))
                aa.font=F(12,True,"9C1F3E" if g["late"] else "1F3864")
                aa.fill=fill(LATEF if g["late"] else "E8EDF2"); aa.alignment=CEN
                for key,r in (("p1",R_P1),("p2",R_P2),("p3a",R_P3A),("p3b",R_P3B),("p4",R_P4),("p5",R_P5)):
                    title,body,ck=g[key]
                    cc=ws.cell(r,col,title+"\n"+body); isfree=ck=="free"
                    cc.font=F(10,not isfree,"8C8C8C" if isfree else "000000",isfree)
                    cc.fill=fill(PAL.get(ck,"FFFFFF")); cc.alignment=CEN
                d=ws.cell(R_DIS,col,g["dismissal"]); d.font=F(12,True,"7F2A2A" if g["early"] else "1F3864")
                d.fill=fill(EARLYF if g["early"] else "E8EDF2"); d.alignment=CEN
        else:
            flat(col,CLOSEDF,"—","")

        for t_,r,flag in EVE:
            cc=ws.cell(r,col,""); cc.fill=fill(EVENTF if flag else "FFFFFF")
            cc.border=Border(left=thin,right=thin,top=hair,bottom=hair)

    for r in range(R_DAY,LAST+1):
        for c_ in range(1,8):
            if r>=EVE[0][1] and 2<=c_<=6: continue
            ws.cell(r,c_).border=box
    for c_ in range(1,8):
        ws.cell(R_DIS,c_).border=Border(left=thin,right=thin,top=thin,bottom=med)
        ws.cell(R_DAY,c_).border=Border(left=thin,right=thin,top=med,bottom=thin)

    ws.page_setup.orientation="landscape"; ws.page_setup.paperSize=ws.PAPERSIZE_LETTER
    ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=1
    ws.sheet_properties.pageSetUpPr.fitToPage=True
    ws.page_margins.left=ws.page_margins.right=0.3
    ws.page_margins.top=ws.page_margins.bottom=0.35
    ws.print_area="A1:G%d"%LAST
    return ws

# ---------------- KEY tab ----------------
def _key_head(ws, title):
    ws.sheet_view.showGridLines=False
    ws.column_dimensions["A"].width=20
    for i in range(6): ws.column_dimensions[get_column_letter(2+i)].width=23
    ws.merge_cells("A1:G1")
    c=ws.cell(1,1,title); c.font=F(14,True,"FFFFFF"); c.fill=fill(DARK); c.alignment=CEN
    ws.row_dimensions[1].height=26
    for j,h in enumerate(["PERIOD / TIME","DAY 1","DAY 2","DAY 3","DAY 4","DAY 5","DAY 6"]):
        cc=ws.cell(3,j+1,h); cc.font=F(10,True,"FFFFFF"); cc.fill=fill(ACCENT); cc.alignment=CEN
    ws.row_dimensions[3].height=22

def _key_tail(ws, r, blocks):
    for head, lines in blocks:
        if head:
            ws.merge_cells(start_row=r,start_column=1,end_row=r,end_column=7)
            cc=ws.cell(r,1,head); cc.font=F(10,True,ACCENT); cc.alignment=LEFT
            ws.row_dimensions[r].height=20; r+=1
        for line in lines:
            ws.merge_cells(start_row=r,start_column=1,end_row=r,end_column=7)
            cc=ws.cell(r,1,line); cc.font=F(9); cc.alignment=LEFT
            ws.row_dimensions[r].height=17 if line else 7; r+=1
        ws.row_dimensions[r].height=8; r+=1
    ws.page_setup.orientation="landscape"; ws.page_setup.paperSize=ws.PAPERSIZE_LETTER
    ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=0   # let the key run long rather than shrink
    ws.sheet_properties.pageSetUpPr.fitToPage=True
    ws.page_margins.left=ws.page_margins.right=0.3
    ws.print_area="A1:G%d"%(r-1)

NO_SCHOOL_LINES=[
 "Mon Sep 21  Yom Kippur          Mon Oct 12  Indigenous Peoples' Day      Tue Nov 3  Professional Dev. Day",
 "Wed Nov 11  Veterans Day        Thu-Fri Nov 26-27  Thanksgiving           Dec 24 - Jan 1  Winter Break",
 "Mon Jan 18  M.L. King Jr. Day   Feb 15-19  February Break                 Tue Mar 9 and Fri Mar 26  No school",
 "Apr 19-23  April Break          Mon May 31  Memorial Day",
 "Early release: Wed Nov 25 · Thu Dec 3 (dismissed 12:40 PM) · Thu Apr 8.  These do not advance the rotation.",
]
TERM_LINES=[
 "Quarter 1 ended Mon Nov 9, 2026.        Quarter 2 and Semester 1 end Thu Jan 28, 2027.",
 "PROGRESS REPORTS appear in Aspen on Wed Oct 7, Tue Dec 15, Mon Mar 8 and Tue May 18.",
 "Quarter 3 ends Mon Apr 12, 2027.        Quarter 4 and the school year end Mon Jun 21, 2027.",
 "MIDTERM EXAMS: Tue Jan 26, Wed Jan 27, Thu Jan 28, 2027.     FINAL EXAMS: Wed-Fri Jun 16-18, 2027.",
 "Exam days carry no rotation day. Jun 22-25 and Jun 28 are reserved snow make-up days, used only if needed.",
]
MCAS_LINES=[
 "Grade 10 MCAS: Mar 23-24, May 18-19 and Jun 1-2, 2027.  These days carry no rotation day.",
 "On MCAS days the school runs two sessions: Session 1 = A, C, E and T/X blocks.  Session 2 = B, D, F, G blocks.",
]
ASK_LINES=[
 "Dismissal times for the Nov 25 and Apr 8 early-release days — not published.",
 "The midterm and final exam schedules — write them in when the school sends them.",
 "Report card and progress report dates — not on any published calendar.",
]

def build_student_key(wb, spec, subtitle, extra_blocks):
    ws=wb.create_sheet("KEY",0)
    _key_head(ws, subtitle+"   ·   Master Schedule & Key")
    PAL=dict(spec.get("palette",{})); PAL.setdefault("lunch","EFEFEF")
    PAL.setdefault("free","F7F7F7"); PAL.setdefault("tblock","E2E2F0")
    rows=[("ARRIVAL","arrival"),("Z Block\n7:30 - 8:15",None),("1st Period\n8:20 - 9:30","p1"),
          ("2nd Period\n9:37 - 10:47","p2"),("3rd Period\n1st half","p3a"),("3rd Period\n2nd half","p3b"),
          ("4th Period\n12:38 - 1:48","p4"),("5th Period\n1:55 - 3:05","p5"),("DISMISSAL","dismissal")]
    r=4
    for label,key in rows:
        ws.row_dimensions[r].height=26 if key in ("arrival","dismissal",None) else 54
        lc=ws.cell(r,1,label); lc.font=F(9,True); lc.alignment=CEN; lc.fill=fill("E8EDF2"); lc.border=box
        for dn in range(1,7):
            g=resolve_day(spec,dn,None)
            if key is None:
                cc=ws.cell(r,1+dn,"FREE — no class"); cc.fill=fill("EFEFEF"); cc.font=F(9,False,"7F7F7F")
            elif key=="arrival":
                v=g["arrival"]+("  ** LATE **" if g["late"] else "")
                cc=ws.cell(r,1+dn,v); cc.font=F(10,True,"9C1F3E" if g["late"] else "1F3864")
                cc.fill=fill(LATEF if g["late"] else "E8EDF2")
            elif key=="dismissal":
                cc=ws.cell(r,1+dn,g["dismissal"]); cc.font=F(10,True,"7F2A2A" if g["early"] else "1F3864")
                cc.fill=fill(EARLYF if g["early"] else "E8EDF2")
            else:
                title,body,ck=g[key]
                cc=ws.cell(r,1+dn,title+"\n"+body)
                cc.font=F(9,ck!="free","8C8C8C" if ck=="free" else "000000",ck=="free")
                cc.fill=fill(PAL.get(ck,"FFFFFF"))
            cc.alignment=CEN; cc.border=box
        r+=1
    r+=1
    _key_tail(ws, r, extra_blocks+[
        ("TERM DATES, EXAMS AND REPORT PERIODS", TERM_LINES),
        ("NO SCHOOL", NO_SCHOOL_LINES),
        ("MCAS", MCAS_LINES),
        ("CHECK THESE WITH THE SCHOOL", ASK_LINES),
        (None, ["Built from the BHS School Year Calendar 2026/27 and the district's per-block calendars.",
                "Always confirm against the school's own calendar before relying on it."]),
    ])

def build_blank_key(wb, subtitle):
    ws=wb.create_sheet("KEY",0)
    _key_head(ws, subtitle+"   ·   Blank Master Grid")
    rows=[("Z Block\n7:30 - 8:15",0),("1st Period\n8:20 - 9:30",1),("2nd Period\n9:37 - 10:47",2),
          ("3rd Period\nClass 1 10:54-12:04 / Lunch 2 12:06-12:36\nLunch 1 10:49-11:19 / Class 2 11:21-12:31",3),
          ("4th Period\n12:38 - 1:48",4),("5th Period\n1:55 - 3:05",5),("DISMISSAL",99)]
    r=4
    for label,pn in rows:
        ws.row_dimensions[r].height=26 if pn==99 else (42 if pn==3 else 34)
        lc=ws.cell(r,1,label); lc.font=F(8 if pn==3 else 9,True); lc.alignment=CEN; lc.fill=fill("E8EDF2"); lc.border=box
        for dn in range(1,7):
            if pn==99:
                v="2:15 PM  ** EARLY **" if dn==6 else "3:05 PM"
                cc=ws.cell(r,1+dn,v); cc.font=F(10,True,"7F2A2A" if dn==6 else "1F3864")
                cc.fill=fill(EARLYF if dn==6 else "E8EDF2")
            elif pn==0:
                cc=ws.cell(r,1+dn,"Z%d"%dn); cc.font=F(9,False,"7F7F7F"); cc.fill=fill("EFEFEF")
            else:
                bs=BLOCKMAP.get((dn,pn))
                if bs=="T1":   cc=ws.cell(r,1+dn,"T1  ·  1:55-2:25\nthen X Block to 3:05"); cc.font=F(9,True,"4A4A72"); cc.fill=fill("E2E2F0")
                elif bs=="T2": cc=ws.cell(r,1+dn,"T2  ·  1:55-2:15\nEARLY DISMISSAL");      cc.font=F(9,True,"4A4A72"); cc.fill=fill("E2E2F0")
                else:          cc=ws.cell(r,1+dn,(bs[0]+" Block   ·   "+bs) if bs else ""); cc.font=F(10,True,"595959"); cc.fill=fill("FFFFFF")
            cc.alignment=CEN; cc.border=box
        r+=1
    r+=1
    _key_tail(ws, r, [
        ("HOW TO USE THIS", [
         "Every date and rotation day in this workbook is already correct for the 2026/27 school year.",
         "Write each student's courses into the blank cells on the weekly tabs.",
         "The grey text in each cell — for example 'D Block · D2' — tells you which block meets in that period on",
         "that rotation day. Match it to the block letters on the student's own schedule.",
         "Fill in ARRIVAL yourself: 8:20 AM if they have a 1st period class, 9:37 AM if 1st period is free.",
        ]),
        ("HOW LUNCH WORKS", [
         "3rd period is split. Which half is lunch depends on the course's department code:",
         "CE, FP, TE, MA, PA, SC, VA, WE  ->  CLASS 1 first (10:54-12:04), then LUNCH 2 (12:06-12:36).",
         "EL, EN, ID, SO, SW, TU, WL      ->  LUNCH 1 first (10:49-11:19), then CLASS 2 (11:21-12:31).",
        ]),
        ("TERM DATES, EXAMS AND REPORT PERIODS", TERM_LINES),
        ("NO SCHOOL", NO_SCHOOL_LINES),
        ("MCAS", MCAS_LINES),
        ("CHECK THESE WITH THE SCHOOL", ASK_LINES),
        (None, ["Built from the BHS School Year Calendar 2026/27 and the district's per-block calendars.",
                "Always confirm against the school's own calendar before relying on it."]),
    ])
