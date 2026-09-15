(function(){
"use strict";
const B=window.__BHS__, D=B.D, $=s=>document.querySelector(s);
function hourLabel(h){ const ap=h<12?"AM":"PM", hh=((h+11)%12)+1; return hh+":00 "+ap; }
function eveningRows(){
  const end=+($("#evening").value||0); if(!end) return [];
  const note=noteOf("ev"), rows=[];
  for(let h=15;h<=end;h++){
    rows.push({label:hourLabel(h), flag:false});
    if(note && note.hour===h) rows.push({label:note.what+"  "+note.time, flag:true});
  }
  return rows;
}
function parseTime(s){
  const m=String(s||"").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if(!m) return null;
  let h=+m[1]%12; if(m[3].toLowerCase()==="p") h+=12;
  return {hour:h, minute:m[2]?+m[2]:0, time:((h%12)||12)+":"+(m[2]||"00")+" "+(m[3].toUpperCase()+"M")};
}
function noteOf(pfx){
  const t=parseTime($("#"+pfx+"Time").value), w=($("#"+pfx+"What").value||"").trim();
  if(!t||!w) return null;
  const days = pfx==="bs" ? [...document.querySelectorAll("#bsDays input:checked")].map(i=>+i.value) : [1,2,3,4,5];
  if(!days.length) return null;
  return {hour:t.hour, time:t.time, what:w, days};
}
const ROWS=[["arr","ARRIVAL","1st period 8:20\n2nd period 9:37"],
            ["z","Z Block  (free)","7:30 - 8:15\n(no class)"],
            ["p1","1st Period","8:20 - 9:30"],["p2","2nd Period","9:37 - 10:47"],
            ["p3a","3rd Period\n1st half","Lunch 1: 10:49-11:19\nClass 1: 10:54-12:04"],
            ["p3b","3rd Period\n2nd half","Class 2: 11:21-12:31\nLunch 2: 12:06-12:36"],
            ["p4","4th Period","12:38 - 1:48"],["p5","5th Period","1:55 - 3:05"],
            ["dis","DISMISSAL","3:05 PM\n(2:15 PM on Day 6)"]];
const esc=s=>String(s==null?"":s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const nl=s=>esc(s).replace(/\n/g,"<br>");

/* A made-up schedule, used only for the "try it" button. No real student or teacher. */
const DEMO=[
 ["WL1000-01","Spanish 2","FY","A(2,4)","1(3) 2(6)","Adams, R."],
 ["EN1000-01","English 9","FY","B Block","1(2,4,6) 2(3)","Brooks, T."],
 ["VA1000-01","Studio Art","FY","C Block","2(2,5) 3(3,6)","Chen, L."],
 ["SC1000-01","Biology","FY","D Block","2(1,4) 3(2,5)","Diaz, M."],
 ["WE1000-01","Health & Wellness","S1","E Block","3(1) 4(2,4,6)","Ellis, J."],
 ["MA1000-01","Algebra 1","FY","F Block","3(4) 4(1) 5(2,5)","Ford, K."],
 ["SO1000-01","US History","FY","G Block","4(3,5) 5(1,4)","Gray, S."],
 ["HR1000-01","Advisory","FY","T Block","5(3,6)","Hall, P."],
].map(r=>r.join("\t")).join("\n");

function msg(el,kind,text){ el.className="msg "+kind; el.textContent=text; }

/* ---------- step 1 ---------- */
function doParse(){
  const out=B.parseAspen($("#paste").value||"");
  if(out.err){ msg($("#parseMsg"),"err",out.err+" Paste the List view of your Aspen schedule, or use the example to see the format."); return; }
  const withMeets=out.rows.filter(r=>r.meets.length||r.pm);
  if(!withMeets.length){ msg($("#parseMsg"),"err","Found course codes but no schedule text like 2(2,5). Make sure the Schedule column is included."); return; }
  B.COURSES=out.rows; B.indexCourses();
  const named=out.rows.filter(r=>r.meets.length).length;
  msg($("#parseMsg"),"ok","Read "+named+" scheduled course"+(named===1?"":"s")+
      (out.rows.length>named?(" plus "+(out.rows.length-named)+" with no class period"):"")+". Check them below.");
  renderEdit(); $("#editCard").style.display="block";
  $("#editCard").scrollIntoView({behavior:"smooth",block:"start"});
}
function scopeOptions(sel){
  const o=[["all","Every time it meets"]];
  for(let d=1;d<=6;d++) o.push(["d"+d,"Only on Day "+d]);
  ["Mondays","Tuesdays","Wednesdays","Thursdays","Fridays"].forEach((n,i)=>o.push(["w"+(i+1),"Only on "+n]));
  return o.map(([v,t])=>'<option value="'+v+'"'+(v===sel?" selected":"")+">"+t+"</option>").join("");
}
function renderEdit(){
  const tb=$("#editRows"); tb.innerHTML="";
  B.COURSES.forEach((r,i)=>{
    if(!r.notes) r.notes=[];
    const tr=document.createElement("tr");
    tr.innerHTML='<td>'+(r.block?'<span class="blk">'+esc(r.block)+'</span>':'<span class="meets">—</span>')+'</td>'+
      '<td><input data-i="'+i+'" data-f="desc" value="'+esc(r.desc)+'"><div class="meets">'+esc(r.code)+'</div></td>'+
      '<td><input data-i="'+i+'" data-f="teacher" value="'+esc(r.teacher)+'"></td>'+
      '<td><input data-i="'+i+'" data-f="room" value="'+esc(r.room)+'" placeholder="optional"></td>'+
      '<td><span class="meets">'+esc(r.term)+'</span></td>'+
      '<td><span class="meets">'+(r.sessions.length?esc(r.sessions.join(", ")):(r.pm?"PM block, day "+r.pm.join(", "):"not scheduled"))+'</span></td>';
    tb.appendChild(tr);
    const nr=document.createElement("tr"); nr.className="noterow-tr";
    nr.innerHTML='<td></td><td colspan="5"><div class="cnotes" data-i="'+i+'"></div></td>';
    tb.appendChild(nr);
    drawNotes(i);
  });
  tb.oninput=e=>{ const t=e.target; if(t.dataset.f!==undefined && t.dataset.i!==undefined && !t.dataset.n)
    B.COURSES[+t.dataset.i][t.dataset.f]=t.value; };
  const split=B.splitRows();
  const conf=B.slotConflicts().concat(split.map(r=>
    '"'+r.desc+'" is listed in more than one block ('+r.sessions.join(", ")+'), which is not possible'));
  const cel=$("#conflictNote");
  if(conf.length){ cel.style.display="block"; cel.className="msg err";
    cel.textContent="Two classes claim the same period: "+conf.join("; ")+
      ". One of the rows was probably misread — fix it before printing."; }
  else cel.style.display="none";
  const badDept=B.COURSES.filter(r=>r.meets.length && !B.deptOK(r.code));
  const del=$("#deptNote");
  if(badDept.length){ del.style.display="block"; del.className="msg warn";
    del.textContent="Course code not recognised for "+badDept.map(r=>r.code).join(", ")+
      ". The first two letters decide which lunch the student gets, so check those against Aspen."; }
  else del.style.display="none";
  const pm=B.COURSES.filter(r=>r.pm);
  if(pm.length){ const el=$("#pmNote"); el.style.display="block"; el.className="msg warn";
    el.textContent="PM block: "+pm.map(r=>r.desc+" ("+r.term+", day "+r.pm.join(" & ")+")").join("; ")+
      ". PM block times are not published, so this is listed here but not placed on the weekly pages."; }
}
function drawNotes(i){
  const box=document.querySelector('.cnotes[data-i="'+i+'"]'); if(!box) return;
  const r=B.COURSES[i];
  box.innerHTML = r.notes.map((n,j)=>
      '<div class="cnote"><input maxlength="64" data-i="'+i+'" data-n="'+j+'" data-k="text" value="'+esc(n.text)+
      '" placeholder="e.g. Rm 212 · bring lab coat">'+
      '<select data-i="'+i+'" data-n="'+j+'" data-k="scope">'+scopeOptions(n.scope)+'</select>'+
      '<button class="mini" data-del="'+i+':'+j+'" title="Remove">&times;</button></div>').join("")
    + '<button class="mini add" data-add="'+i+'">+ note on this class</button>';
  box.oninput=e=>{ const t=e.target; if(!t.dataset.k) return;
    B.COURSES[+t.dataset.i].notes[+t.dataset.n][t.dataset.k]=t.value; live(); };
  box.onchange=box.oninput;
  box.onclick=e=>{
    const add=e.target.dataset.add, del=e.target.dataset.del;
    if(add!==undefined){ B.COURSES[+add].notes.push({text:"",scope:"all"}); drawNotes(+add); }
    else if(del){ const [ci,ni]=del.split(":").map(Number);
      B.COURSES[ci].notes.splice(ni,1); drawNotes(ci); live(); }
  };
}
function live(){ if($("#outCard").style.display==="block") build(); }

/* ---------- at a glance ---------- */
function renderGlance(){
  let h='<table class="grid"><thead><tr><th class="rowlab"></th>';
  for(let d=1;d<=6;d++) h+="<th>DAY "+d+"</th>";
  h+="</tr></thead><tbody>";
  const R=[]; for(let d=1;d<=6;d++) R.push(B.resolveDay(d,null));
  ROWS.forEach(([k,label])=>{
    h+='<tr><th class="rowlab">'+nl(label)+"</th>";
    for(let d=0;d<6;d++){
      const g=R[d];
      if(k==="arr")      h+='<td class="arr'+(g.arrival[1]?" late":"")+'">'+esc(g.arrival[0])+(g.arrival[1]?"<br>LATE START":"")+"</td>";
      else if(k==="dis") h+='<td class="dis'+(g.dismissal[1]?" early":"")+'">'+esc(g.dismissal[0])+"</td>";
      else if(k==="z")   h+='<td class="free">free</td>';
      else { const c=g.cells[k];
        const nn=(c.notes||[]).filter(Boolean);
        h+='<td'+(c.color?' style="background:'+c.color+'"':(c.kind==="free"?' class="free"':""))+'>'+
           '<span class="cname">'+esc(c.name)+'</span><span class="cmeta">'+nl(c.meta)+'</span>'+
           (nn.length?'<span class="cnotep">'+nn.map(esc).join(" · ")+"</span>":"")+'</td>'; }
    }
    h+="</tr>";
  });
  $("#atGlance").innerHTML=h+"</tbody></table>";
}

/* ---------- weekly pages ---------- */
function weekMondays(mode){
  const first=B.mkDate(D.firstMonday), last=B.mkDate(D.lastMonday), out=[];
  for(let m=first;m<=last;m=B.addDays(m,7)) out.push(m);
  const now=new Date(), today=B.iso(new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())));
  const onOrAfter = out.filter(m=>B.iso(B.addDays(m,6))>=today);
  const current   = out.filter(m=>B.iso(m)<=today && today<=B.iso(B.addDays(m,6)));
  if(mode==="sem1")      return out.filter(m=>B.iso(m)<D.sem2Start);
  if(mode==="sem2")      return out.filter(m=>B.iso(B.addDays(m,4))>=D.sem2Start);
  if(mode==="next4")     return (onOrAfter.length?onOrAfter:out).slice(0,4);
  if(mode==="rest")      return onOrAfter.length?onOrAfter:out;
  if(mode==="thisweek")  return current.length?current:(onOrAfter.length?[onOrAfter[0]]:[out[0]]);
  if(mode==="lastweek"){
    const i=out.findIndex(m=>B.iso(m)===B.iso(current[0]||onOrAfter[0]||out[0]));
    return [out[Math.max(0,i-1)]];
  }
  if(mode==="thismonth"){
    const y=now.getFullYear(), mo=now.getMonth();
    const inMonth=out.filter(m=>[0,1,2,3,4].some(i=>{const d=B.addDays(m,i);
      return d.getUTCFullYear()===y && d.getUTCMonth()===mo;}));
    return inMonth.length?inMonth:(onOrAfter.length?onOrAfter.slice(0,4):out.slice(0,4));
  }
  return out;
}
function cellHTML(c){
  if(!c) return "<td></td>";
  const st=c.color?' style="background:'+c.color+'"':"";
  const cls=c.kind==="free"?"cls free":(c.kind==="lunch"?"cls":(c.kind==="t"?"cls":"cls"));
  const bg=c.kind==="lunch"?' style="background:#efefef"':(c.kind==="t"?' style="background:#e2e2f0"':st);
  const notes=(c.notes||[]).filter(Boolean);
  const nh=notes.length?'<span class="cnotep">'+notes.map(esc).join(" · ")+"</span>":"";
  return '<td class="'+cls+'"'+bg+'><span class="cname">'+esc(c.name)+'</span><span class="cmeta">'+nl(c.meta)+"</span>"+nh+"</td>";
}
function renderWeeks(){
  const who=($("#who").value||"").trim();
  const title=(who?who+"  ·  ":"")+"HIGH KEY  ·  BHS WEEKLY PLANNER";
  const ms=weekMondays($("#range").value);
  const out=[];
  ms.forEach(mon=>{
    const days=[0,1,2,3,4].map(i=>B.addDays(mon,i));
    let h='<div class="wk"><table class="week">';
    h+='<tr><td class="title" colspan="7">'+esc(title)+"   ·   Week of "+esc(B.fmtLong(mon))+"</td></tr>";
    h+='<tr><td class="rowlab"></td>';
    days.forEach(d=>h+='<td class="dayhdr">'+B.DOW[d.getUTCDay()].toUpperCase()+"   "+B.fmtShort(d)+"</td>");
    h+='<td class="dayhdr">TIMES</td></tr>';
    const info=days.map(d=>({d, ds:B.iso(d), i:B.dayInfo(B.iso(d))}));
    const res=info.map(x=>x.i.type==="day"?B.resolveDay(x.i.dn,x.ds):null);
    h+='<tr><td class="rowlab k">ROTATION DAY</td>';
    info.forEach((x,i)=>{
      const t=x.i.type;
      if(t==="day")           h+='<td class="daynum">DAY '+x.i.dn+"</td>";
      else if(t==="closed")   h+='<td class="closed">'+esc(x.i.banner)+"</td>";
      else if(t==="snow")     h+='<td class="closed">SNOW MAKE-UP</td>';
      else if(t==="last")     h+='<td class="examhdr" style="background:#7f2a2a">LAST DAY</td>';
      else if(t==="exam")     h+='<td class="examhdr">'+esc(x.i.banner)+"</td>";
      else if(t==="mcas")     h+='<td class="mcashdr">MCAS TESTING</td>';
      else if(t==="special")  h+='<td class="spechdr">'+esc(x.i.banner)+"</td>";
      else                    h+='<td class="closed">—</td>';
    });
    h+="<td></td></tr>";
    h+='<tr><td class="rowlab">SCHOOL NOTES</td>';
    info.forEach(x=>{ const ev=D.events[x.ds]||(x.i.type==="closed"?x.i.why:"")||(x.i.type==="special"?x.i.note:"")||
                              (x.i.type==="mcas"?"Grade 10 MCAS":"")||(x.i.type==="snow"?"only if snow days were used":"");
      h+='<td class="note'+(ev?" has":"")+'">'+esc(ev)+"</td>"; });
    h+="<td></td></tr>";
    const bs=noteOf("bs");
    if(bs){
      h+='<tr><td class="rowlab">BEFORE SCHOOL</td>';
      info.forEach((x,i)=>{
        const wd=x.d.getUTCDay(), on = bs.days.includes(wd) && (x.i.type!=="closed" && x.i.type!=="snow" && x.i.type!=="none");
        h+='<td class="bs">'+(on?esc(bs.time+"  ·  "+bs.what):"")+"</td>";
      });
      h+='<td class="times">before<br>Z Block</td></tr>';
    }
    ROWS.forEach(([k,label,times])=>{
      h+='<tr><td class="rowlab'+(k==="arr"||k==="dis"?" k":"")+'">'+nl(label)+"</td>";
      info.forEach((x,i)=>{
        const t=x.i.type, g=res[i];
        if(t==="day"){
          if(k==="arr")      h+='<td class="arr'+(g.arrival[1]?" late":"")+'">'+esc(g.arrival[0])+(g.arrival[1]?"<br>** LATE START **":"")+"</td>";
          else if(k==="dis") h+='<td class="dis'+(g.dismissal[1]?" early":"")+'">'+esc(g.dismissal[0])+"</td>";
          else if(k==="z")   h+='<td class="z">free — no class</td>';
          else               h+=cellHTML(g.cells[k]);
        } else if(t==="closed"||t==="snow"||t==="none"){
          h+='<td class="closed">'+(k==="p2"?(t==="snow"?"reserved make-up day":"— no school —"):"")+"</td>";
        } else if(t==="exam"){
          h+='<td class="exam">'+(k==="arr"||k==="dis"?"see exam<br>schedule":(k==="p2"?"Exam schedule not published —<br>write in each exam and its time":""))+"</td>";
        } else if(t==="mcas"){
          let v="";
          if(k==="arr"||k==="dis") v="see MCAS<br>schedule";
          else if(k==="p2") v="SESSION 1<br>"+esc(mcasList(D.mcasS1,x.ds));
          else if(k==="p4") v="SESSION 2<br>"+esc(mcasList(D.mcasS2,x.ds));
          else if(k==="p3a") v="times not published";
          h+='<td class="mcas">'+v+"</td>";
        } else if(t==="last"){
          h+='<td class="exam">'+(k==="p2"?"Last day of school<br>Schedule not published":"")+"</td>";
        } else { /* special */
          let v="";
          if(k==="arr") v="8:20 AM"; else if(k==="dis") v=esc(x.i.dismissal);
          else if(k==="p2") v="Special schedule —<br>classes shortened"; else if(k==="z") v="free";
          h+='<td style="background:#fce4d6;color:#7f4f00;font-weight:600">'+v+"</td>";
        }
      });
      h+='<td class="times">'+nl(times)+"</td></tr>";
    });
    const eve=eveningRows();
    if(eve.length){
      h+='<tr><td class="afthdr" colspan="7">AFTER SCHOOL  →  '+esc(eve[eve.length-1].label)+
         '      (write in activities, appointments, plans, homework)</td></tr>';
      eve.forEach(r=>{
        h+='<tr><td class="eve lab'+(r.flag?" dinner":"")+'">'+esc(r.label)+"</td>";
        for(let i=0;i<5;i++) h+='<td class="eve'+(r.flag?" dinner":"")+'"></td>';
        h+='<td class="eve lab'+(r.flag?" dinner":"")+'">'+esc(r.label)+"</td></tr>";
      });
    }
    out.push(h+"</table></div>");
  });
  document.getElementById("printArea").innerHTML=out.join("");
  return ms.length;
}
function mcasList(letters, ds){
  const names=[];
  for(let d=1;d<=6;d++) for(let p=1;p<=5;p++){
    const b=D.blockMap[d+"-"+p]; if(!b) continue;
    if(letters.indexOf(b[0])<0) continue;
    const c=B.pick(d+"-"+p, ds);
    if(c && names.indexOf(c.desc)<0) names.push(c.desc);
  }
  return names.length?names.join(", "):"—";
}

window.__WEEKS__=weekMondays; window.__EVEROWS__=eveningRows; window.__BSNOTE__=()=>noteOf("bs");

/* ---------- wiring ---------- */
function build(){
  B.indexCourses(); renderGlance();
  const n=renderWeeks();
  $("#outCard").style.display="block";
  const label=$("#range").selectedOptions[0].textContent;
  $("#outInfo").textContent=n+" page"+(n===1?"":"s")+" — "+label.toLowerCase()+".";
  msg($("#outMsg"),"ok","Printing gives you one landscape page per week. Set your browser to print backgrounds so the colours come through.");
  $("#outCard").scrollIntoView({behavior:"smooth",block:"start"});
}
(function(){
  const names=["Mon","Tue","Wed","Thu","Fri"];
  $("#bsDays").innerHTML=names.map((n,i)=>
    '<label><input type="checkbox" value="'+(i+1)+'" checked id="bsd'+(i+1)+'">'+n+"</label>").join("");
})();
$("#btnParse").onclick=doParse;
$("#btnDemo").onclick=()=>{ $("#paste").value=DEMO; doParse();
  msg($("#parseMsg"),"warn","Loaded a made-up schedule so you can see how it works. Clear it before building a real one."); };
$("#btnClear").onclick=()=>{ $("#paste").value=""; $("#parseMsg").className="msg";
  $("#editCard").style.display="none"; $("#outCard").style.display="none"; };
$("#btnBuild").onclick=build;
$("#btnPrint").onclick=()=>{ renderWeeks(); window.print(); };
$("#btnXlsx").onclick=()=>window.__XLSX__ && window.__XLSX__();
["range","evening","who","bsTime","bsWhat","evTime","evWhat","bsd1","bsd2","bsd3","bsd4","bsd5"].forEach(id=>{
  const el=$("#"+id); if(!el) return;
  const go=()=>{ if($("#outCard").style.display==="block") build(); };
  el.onchange=go; if(el.tagName==="INPUT"&&el.type==="text") el.onblur=go;
});
})();
