/* High Key · BHS Weekly Planner — everything runs in this page. Nothing is uploaded. */
(function(){
"use strict";
const D = window.__DISTRICT__;
const $ = s => document.querySelector(s);
const iso = d => d.toISOString().slice(0,10);
const mkDate = s => { const [y,m,dd]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,dd)); };
const addDays = (d,n) => new Date(d.getTime()+n*86400000);
const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fmtLong = d => MON[d.getUTCMonth()]+" "+d.getUTCDate()+", "+d.getUTCFullYear();
const fmtShort = d => (d.getUTCMonth()+1)+"/"+d.getUTCDate();
const PALETTE = ["dcEaf7","fbe0ce","ddeedc","e6deef","faf0cc","d5edea","f7dfe4","e8e2b4","cfe3e8","e4e7ec"]
                .map(h=>"#"+h.toLowerCase());
const C1L2 = new Set(D.class1Lunch2);

let COURSES = [];      // parsed rows
let SLOTS   = {};      // "day-period" -> [course,...]
let PMROWS  = [];

/* ---------------- department codes ----------------
   The two-letter prefix of a course code decides which half of the split
   3rd period the course sits in. */
const DEPTS=["CE","EL","EN","FP","HR","ID","MA","PA","SC","SO","SW","TE","TU","VA","WE","WL"];
function deptOK(code){ return DEPTS.indexOf(String(code).slice(0,2).toUpperCase())>=0; }

/* ---------------- parsing ---------------- */
function parseAspen(text){
  const codeRe = /(?:^|[^A-Z0-9])([A-Z]{2}[A-Z0-9]{2,8}-\d{2})(?![A-Z0-9])/g;
  const hits=[]; let m;
  while((m=codeRe.exec(text))!==null){ const at=m.index+m[0].length-m[1].length;
    hits.push({code:m[1], at:at, end:at+m[1].length}); }
  if(!hits.length) return {rows:[], err:"Couldn't find any course codes (like AB1234-05) in what you pasted."};
  const rows=[];
  hits.forEach((h,i)=>{
    const chunk = text.slice(h.end, i+1<hits.length ? hits[i+1].at : text.length)
                      .replace(/[\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim();
    const termM  = chunk.match(/\b(FY|S1|S2|S3|Q[1-4])\b/);
    const trackM = chunk.match(/\b([A-Z])\s*Block\b/) || chunk.match(/\b([A-G])\(([\d,]+)\)/);
    const NAME=/([A-Z][A-Za-z'’\-]+,\s*[A-Z](?:[A-Za-z'’\-]*\.?|\.))/;
    const teachM = chunk.match(new RegExp(NAME.source+"\\s*$")) || chunk.match(NAME);
    const meets=[]; let pm=null;
    let re=/\b(\d)\(([\d,]+)\)/g, g;
    while((g=re.exec(chunk))!==null){
      const per=+g[1];
      g[2].split(",").forEach(d=>{ const dn=+d; if(dn>=1&&dn<=6&&per>=1&&per<=5) meets.push({day:dn,per}); });
    }
    const pmM = chunk.match(/\bPM\(([\d,]+)\)/);
    if(pmM) pm = pmM[1].split(",").map(Number);
    let desc = chunk.slice(0, termM ? termM.index : chunk.length).trim();
    desc = desc.replace(/\s*[-–]\s*$/,"").trim();
    if(!desc && teachM) desc = h.code;
    rows.push({code:h.code, desc:desc||h.code, term:(termM?termM[1]:"FY"),
               track:(trackM?trackM[1]:""), teacher:(teachM?teachM[1]:""), room:"",
               meets, pm});
  });
  return {rows};
}

function blockLetterFor(r){
  if(r.track) return r.track;
  for(const s of r.meets){ const b=D.blockMap[s.day+"-"+s.per]; if(b) return b[0]; }
  return "";
}
function sessionsFor(r){
  const out=[];
  r.meets.forEach(s=>{ const b=D.blockMap[s.day+"-"+s.per]; if(b&&!out.includes(b)) out.push(b); });
  return out.sort();
}

function splitRows(){
  return COURSES.filter(r=>{
    const letters={};
    (r.sessions||[]).forEach(s=>letters[s[0]]=1);
    return Object.keys(letters).length>1;
  });
}
function slotConflicts(){
  const seen={}, bad=[];
  COURSES.forEach(r=>{
    (r.meets||[]).forEach(s=>{
      const k=s.day+"-"+s.per;
      (seen[k]=seen[k]||[]).push(r);
    });
  });
  Object.keys(seen).forEach(k=>{
    const list=seen[k];
    ["S1","S2"].forEach(sem=>{
      const live=list.filter(c=>c.term==="FY"||c.term===sem);
      if(live.length>1){
        const names=live.map(c=>c.desc).join(" and ");
        const msg=names+" both land in period "+k.split("-")[1]+" on Day "+k.split("-")[0]+
                  " ("+(sem==="S1"?"semester 1":"semester 2")+")";
        if(bad.indexOf(msg)<0) bad.push(msg);
      }
    });
  });
  return bad;
}
function indexCourses(){
  SLOTS={}; PMROWS=[];
  let ci=0;
  COURSES.forEach(r=>{
    r.block = blockLetterFor(r);
    r.sessions = sessionsFor(r);
    if(r.color===undefined) r.color = PALETTE[ci++ % PALETTE.length];
    if(r.pm){ PMROWS.push(r); }
    r.meets.forEach(s=>{ const k=s.day+"-"+s.per; (SLOTS[k]=SLOTS[k]||[]).push(r); });
  });
}
/* Terms a weekly page can actually place. BHS also runs courses shorter than a
   semester — the ACE program's are trimester-length, six weeks each — and Aspen
   labels those with terms pick() cannot put on a date. Such a course is surfaced
   as a warning in step 2 rather than dropped in silence.
   Mirrored in planner.py PLACEABLE_TERMS. */
const PLACEABLE_TERMS=["FY","S1","S2"];
function termPlaceable(t){ return PLACEABLE_TERMS.indexOf(String(t||"FY").toUpperCase())>=0; }

function pick(key, dateStr){
  const list=SLOTS[key]; if(!list||!list.length) return null;
  const sem = (dateStr && dateStr >= D.sem2Start) ? "S2" : "S1";
  return list.find(c=>c.term==="FY"||c.term===sem) || null;
}

/* ---------------- day resolution ---------------- */
function resolveDay(dn, dateStr){
  const out={cells:{}};
  const at = p => ({block:D.blockMap[dn+"-"+p], course:pick(dn+"-"+p, dateStr)});
  [1,2,4].forEach(p=>{
    const {block,course}=at(p);
    out.cells["p"+p] = course
      ? {kind:"class", name:course.desc, meta:metaLine(course,block), color:course.color,
         notes:notesFor(course,dn,dateStr)}
      : {kind:"free", name:"FREE — no class", meta:(block?block[0]+" block does not meet":"")};
  });
  const t3=at(3);
  if(!t3.course){
    out.cells.p3a={kind:"lunch",name:"LUNCH 1",meta:"10:49 - 11:19"};
    out.cells.p3b={kind:"free",name:"FREE — no class",meta:"11:21 - 12:31"};
  } else {
    const c=t3.course, first = C1L2.has(c.code.slice(0,2).toUpperCase());
    const cell={kind:"class",name:c.desc,meta:metaLine(c,t3.block)+"\n"+(first?"Class 1 · 10:54-12:04":"Class 2 · 11:21-12:31"),
                color:c.color, notes:notesFor(c,dn,dateStr)};
    if(first){ out.cells.p3a=cell; out.cells.p3b={kind:"lunch",name:"LUNCH 2",meta:"12:06 - 12:36"}; }
    else     { out.cells.p3a={kind:"lunch",name:"LUNCH 1",meta:"10:49 - 11:19"}; out.cells.p3b=cell; }
  }
  const t5=at(5);
  if(t5.block==="T1"||t5.block==="T2"){
    const c=t5.course;
    const body=(c?[lastName(c.teacher),c.room?"Rm "+c.room:""].filter(Boolean).join("  ·  ")+"\n":"")+
      (t5.block==="T1" ? "T1 · 1:55 - 2:25\nthen X Block to 3:05" : "T2 · 1:55 - 2:15\nEARLY DISMISSAL");
    out.cells.p5={kind:"t", name:(c?c.desc:"T BLOCK"), meta:body.trim(), notes:notesFor(c,dn,dateStr)};
    out.dismissal = t5.block==="T1" ? ["3:05 PM",false] : ["2:15 PM  ** EARLY **",true];
  } else if(!t5.course){
    out.cells.p5={kind:"free",name:"FREE — no class",meta:"1:55 - 3:05"};
  } else {
    out.cells.p5={kind:"class",name:t5.course.desc,meta:metaLine(t5.course,t5.block),color:t5.course.color,
                  notes:notesFor(t5.course,dn,dateStr)};
  }
  const has = p => !!pick(dn+"-"+p, dateStr);
  out.arrival = has(1) ? ["8:20 AM",false] : has(2) ? ["9:37 AM",true]
              : has(3) ? ["10:49 AM",true] : ["12:38 PM",true];
  if(!out.dismissal) out.dismissal = has(5) ? ["3:05 PM",false] : ["1:48 PM  ** EARLY **",true];
  return out;
}
const lastName = t => String(t||"").split(",")[0].trim();
/* scope: "all" | "d1".."d6" (rotation day) | "w1".."w5" (Mon..Fri) */
function notesFor(c, dn, dateStr){
  if(!c || !c.notes || !c.notes.length) return [];
  let wd=0;
  if(dateStr){ const d=mkDateLocal(dateStr); wd=d.getUTCDay(); }
  return c.notes.filter(n=>{
    if(!n.text) return false;
    if(n.scope==="all") return true;
    if(n.scope[0]==="d") return +n.scope.slice(1)===dn;
    if(n.scope[0]==="w") return +n.scope.slice(1)===wd;
    return false;
  }).map(n=>n.text);
}
function mkDateLocal(s){ const [y,m,d]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); }
function metaLine(c, block){
  const bits=[]; if(c.teacher) bits.push(lastName(c.teacher));
  bits.push(c.room?("Rm "+c.room):"");
  const l1=bits.filter(Boolean).join("  ·  ");
  const l2=block?(block[0]+" Block  ·  "+block):"";
  return [l1,l2].filter(Boolean).join("\n");
}
function pmFor(dn){ return PMROWS.filter(r=>r.pm && r.pm.includes(dn)); }

/* ---------------- day classification ---------------- */
function dayInfo(ds){
  if(D.closed[ds])  return {type:"closed", banner:D.closed[ds].banner, why:D.closed[ds].why};
  if(D.snow.includes(ds)) return {type:"snow"};
  if(ds===D.lastDay) return {type:"last"};
  if(D.exams[ds])   return {type:"exam", banner:D.exams[ds]};
  if(D.mcas.includes(ds)) return {type:"mcas"};
  if(D.special[ds]) return {type:"special", ...D.special[ds]};
  if(D.dayNum[ds]!==undefined) return {type:"day", dn:D.dayNum[ds]};
  return {type:"none"};
}
window.__BHS__ = {parseAspen, resolveDay, dayInfo, indexCourses, deptOK, DEPTS, termPlaceable,
  PLACEABLE_TERMS, slotConflicts, splitRows,
  get COURSES(){return COURSES;}, set COURSES(v){COURSES=v;},
  get SLOTS(){return SLOTS;}, pick, pmFor, PALETTE,
  iso, mkDate, addDays, fmtLong, fmtShort, DOW, D};
})();
