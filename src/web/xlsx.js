/* Styled .xlsx export via ExcelJS (loaded from cdnjs). Mirrors the printed layout. */
(function(){
"use strict";
const B=window.__BHS__, D=B.D, $=s=>document.querySelector(s);

const ROWS=[["arr","ARRIVAL","1st period 8:20\n2nd period 9:37"],
            ["z","Z Block  (free)","7:30 - 8:15\n(no class)"],
            ["p1","1st Period","8:20 - 9:30"],["p2","2nd Period","9:37 - 10:47"],
            ["p3a","3rd Period\n1st half","Lunch 1: 10:49-11:19\nClass 1: 10:54-12:04"],
            ["p3b","3rd Period\n2nd half","Class 2: 11:21-12:31\nLunch 2: 12:06-12:36"],
            ["p4","4th Period","12:38 - 1:48"],["p5","5th Period","1:55 - 3:05"],
            ["dis","DISMISSAL","3:05 PM\n(2:15 PM on Day 6)"]];
const HEX=c=>"FF"+String(c||"#ffffff").replace("#","").toUpperCase();
const DARK="FF092142", ACC="FFCE222F", ACCBG="FFE7ECF3", GREY="FFF2F2F2", CLOSED="FFD9D9D9",
      EVENT="FFFFF2CC", LATE="FFFFE2E8", EARLY="FFFCE4D6", EXAM="FFF3E8EF", MCASF="FFE4EEF6";
const thin={style:"thin",color:{argb:"FFB7B7B7"}};
const BOX={top:thin,left:thin,bottom:thin,right:thin};
const CEN={vertical:"middle",horizontal:"center",wrapText:true};
const font=(sz,b,c)=>({name:"Arial",size:sz,bold:!!b,color:{argb:c||"FF000000"}});
const fillOf=argb=>({type:"pattern",pattern:"solid",fgColor:{argb}});

function set(ws,r,c,v,o){ const cell=ws.getCell(r,c); cell.value=v==null?"":v;
  cell.alignment=o&&o.align||CEN; cell.border=BOX;
  if(o&&o.font) cell.font=o.font; if(o&&o.fill) cell.fill=fillOf(o.fill); return cell; }

const weekMondays = m => window.__WEEKS__(m);       // one implementation, shared with the printed pages
function load(){
  return new Promise((res,rej)=>{
    if(window.ExcelJS) return res();
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    s.onload=()=>res(); s.onerror=()=>rej(new Error("could not load the spreadsheet library"));
    document.head.appendChild(s);
  });
}

window.__XLSX__=async function(){
  const out=$("#outMsg");
  out.className="msg"; out.textContent="";
  try{
    out.className="msg warn"; out.textContent="Building the spreadsheet…";
    await load();
    const who=($("#who").value||"").trim();
    const title=(who?who+"  ·  ":"")+"HIGH KEY  ·  BHS WEEKLY PLANNER";
    const eve=window.__EVEROWS__();
    const bs=window.__BSNOTE__();
    const wb=new ExcelJS.Workbook();
    weekMondays($("#range").value).forEach(mon=>{
      const days=[0,1,2,3,4].map(i=>B.addDays(mon,i));
      const ws=wb.addWorksheet(B.fmtShort(mon).replace("/","-"),{
        pageSetup:{orientation:"landscape",paperSize:1,fitToPage:true,fitToWidth:1,fitToHeight:1,
                   margins:{left:.3,right:.3,top:.35,bottom:.35,header:.2,footer:.2}},
        views:[{showGridLines:false}]});
      ws.getColumn(1).width=15; for(let i=2;i<=6;i++) ws.getColumn(i).width=25; ws.getColumn(7).width=19;
      ws.mergeCells(1,1,1,7);
      set(ws,1,1,title+"   ·   Week of "+B.fmtLong(mon),{font:font(14,true,"FFFFFFFF"),fill:DARK});
      ws.getRow(1).height=26;
      set(ws,2,1,"",{fill:ACC});
      days.forEach((d,i)=>set(ws,2,2+i,B.DOW[d.getUTCDay()].toUpperCase()+"   "+B.fmtShort(d),
        {font:font(11,true,"FFFFFFFF"),fill:ACC}));
      set(ws,2,7,"TIMES",{font:font(9,true,"FFFFFFFF"),fill:ACC}); ws.getRow(2).height=22;
      set(ws,3,1,"ROTATION DAY",{font:font(9,true,"FFFFFFFF"),fill:ACC});
      set(ws,3,7,"",{fill:ACC});
      set(ws,4,1,"SCHOOL NOTES",{font:font(9,true),fill:GREY}); set(ws,4,7,"",{fill:GREY});
      ws.getRow(3).height=26; ws.getRow(4).height=24;
      const info=days.map(d=>({ds:B.iso(d),i:B.dayInfo(B.iso(d))}));
      const res=info.map(x=>x.i.type==="day"?B.resolveDay(x.i.dn,x.ds):null);
      info.forEach((x,i)=>{
        const t=x.i.type, c=2+i;
        if(t==="day")          set(ws,3,c,"DAY "+x.i.dn,{font:font(13,true,"FFFFFFFF"),fill:DARK});
        else if(t==="closed")  set(ws,3,c,x.i.banner,{font:font(11,true,"FF7F2A2A"),fill:CLOSED});
        else if(t==="snow")    set(ws,3,c,"SNOW MAKE-UP",{font:font(11,true,"FF7F2A2A"),fill:CLOSED});
        else if(t==="last")    set(ws,3,c,"LAST DAY",{font:font(11,true,"FFFFFFFF"),fill:"FF7F2A2A"});
        else if(t==="exam")    set(ws,3,c,x.i.banner,{font:font(11,true,"FFFFFFFF"),fill:"FF7B4B6B"});
        else if(t==="mcas")    set(ws,3,c,"MCAS TESTING",{font:font(11,true,"FFFFFFFF"),fill:"FF3F6E8C"});
        else if(t==="special") set(ws,3,c,x.i.banner,{font:font(11,true,"FF7F4F00"),fill:EARLY});
        else                   set(ws,3,c,"—",{font:font(10,true,"FF7F7F7F"),fill:CLOSED});
        const ev=D.events[x.ds]||(t==="closed"?x.i.why:"")||(t==="special"?x.i.note:"")||
                 (t==="mcas"?"Grade 10 MCAS":"")||(t==="snow"?"only if snow days were used":"");
        set(ws,4,c,ev,{font:font(9,true,"FF7F4F00"),fill:ev?EVENT:GREY});
      });
      const H={arr:28,z:17,p1:42,p2:42,p3a:54,p3b:54,p4:42,p5:54,dis:24};
      let rowBase=5;
      if(bs){
        ws.getRow(rowBase).height=20;
        set(ws,rowBase,1,"BEFORE SCHOOL",{font:font(9,true)});
        set(ws,rowBase,7,"before Z Block",{font:font(8,false,"FF1F3864")});
        info.forEach((x2,i)=>{
          const wd=B.mkDate(x2.ds).getUTCDay();
          const on=bs.days.includes(wd)&&["closed","snow","none"].indexOf(x2.i.type)<0;
          set(ws,rowBase,2+i,on?(bs.time+"  ·  "+bs.what):"",{font:font(9,true,"FF2C5340"),fill:"FFEEF4EC"});
        });
        rowBase++;
      }
      ROWS.forEach(([k,label,times],ri)=>{
        const r=rowBase+ri; ws.getRow(r).height=H[k];
        set(ws,r,1,label,{font:font(9,k==="arr"||k==="dis"),fill:(k==="arr"||k==="dis")?ACCBG:"FFFFFFFF"});
        set(ws,r,7,times,{font:font(8,k==="dis","FF1F3864"),fill:(k==="arr"||k==="dis")?ACCBG:"FFFFFFFF"});
        info.forEach((x,i)=>{
          const c=2+i, t=x.i.type, g=res[i];
          if(t==="day"){
            if(k==="arr") set(ws,r,c,g.arrival[0]+(g.arrival[1]?"\n** LATE START **":""),
                 {font:font(12,true,g.arrival[1]?"FF9C1F3E":"FF1F3864"),fill:g.arrival[1]?LATE:ACCBG});
            else if(k==="dis") set(ws,r,c,g.dismissal[0],
                 {font:font(12,true,g.dismissal[1]?"FF7F2A2A":"FF1F3864"),fill:g.dismissal[1]?EARLY:ACCBG});
            else if(k==="z") set(ws,r,c,"free — no class",{font:font(8,false,"FF7F7F7F")});
            else { const cc=g.cells[k];
              const bg = cc.color?HEX(cc.color):(cc.kind==="lunch"?"FFEFEFEF":(cc.kind==="t"?"FFE2E2F0":
                         (cc.kind==="free"?"FFF7F7F7":"FFFFFFFF")));
              const nn=(cc.notes||[]).filter(Boolean);
              set(ws,r,c,cc.name+"\n"+cc.meta+(nn.length?"\n"+nn.join(" · "):""),
                  {font:font(10,cc.kind!=="free",cc.kind==="free"?"FF8C8C8C":"FF000000"),fill:bg});
              if(nn.length) ws.getRow(r).height=Math.max(ws.getRow(r).height||0,H[k]+11); }
          } else if(t==="closed"||t==="snow"||t==="none"){
            set(ws,r,c,k==="p2"?(t==="snow"?"reserved make-up day":"— no school —"):"",
                {font:font(10,true,"FF7F7F7F"),fill:CLOSED});
          } else if(t==="exam"){
            set(ws,r,c,(k==="arr"||k==="dis")?"see exam\nschedule":(k==="p2"?"Exam schedule not published —\nwrite in each exam and its time":""),
                {font:font(9,k==="arr"||k==="dis","FF7B4B6B"),fill:(k==="arr"||k==="dis"||k==="p2")?EXAM:"FFFFFFFF"});
          } else if(t==="mcas"){
            let v=""; if(k==="arr"||k==="dis") v="see MCAS\nschedule";
            else if(k==="p2") v="SESSION 1\n"+mcasList(D.mcasS1,x.ds);
            else if(k==="p4") v="SESSION 2\n"+mcasList(D.mcasS2,x.ds);
            else if(k==="p3a") v="times not published";
            set(ws,r,c,v,{font:font(9,true,"FF1F3864"),fill:v?MCASF:"FFFFFFFF"});
          } else if(t==="last"){
            set(ws,r,c,k==="p2"?"Last day of school\nSchedule not published":"",{font:font(9,true,"FF7F2A2A"),fill:"FFFDECEC"});
          } else {
            let v=""; if(k==="arr") v="8:20 AM"; else if(k==="dis") v=x.i.dismissal;
            else if(k==="p2") v="Special schedule —\nclasses shortened"; else if(k==="z") v="free";
            set(ws,r,c,v,{font:font(10,true,"FF7F4F00"),fill:EARLY});
          }
        });
      });
      let r=rowBase+ROWS.length;
      if(eve.length){
        ws.mergeCells(r,1,r,7);
        const endRow=eve.filter(x=>!x.flag).pop()||eve[eve.length-1];
        set(ws,r,1,"AFTER SCHOOL  →  "+endRow.label+"      (write in activities, appointments, plans, homework)",
            {font:font(9,true,"FFFFFFFF"),fill:ACC,align:{vertical:"middle",horizontal:"left"}});
        ws.getRow(r).height=16; r++;
        eve.forEach(row=>{
          ws.getRow(r).height=26;
          set(ws,r,1,row.label,{font:font(9,row.flag),fill:row.flag?EVENT:"FFFFFFFF"});
          info.forEach((x2,i)=>{
            const wd=B.mkDate(x2.ds).getUTCDay();
            const on=row.flag && row.days.includes(wd) && ["closed","snow","none"].indexOf(x2.i.type)<0;
            set(ws,r,2+i,on?row.what:"",{font:font(9,true),fill:on?EVENT:"FFFFFFFF"});
          });
          set(ws,r,7,row.label,{font:font(8,row.flag,"FF1F3864"),fill:row.flag?EVENT:"FFFFFFFF"});
          r++;
        });
      }
      ws.pageSetup.printArea="A1:G"+(r-1);
    });
    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const filename=(who?who.replace(/[^\w\-]+/g,"_")+"_":"")+"High_Key_Weekly_Planner.xlsx";
    // Hosted on claude.ai the page must hand the file over through the downloads
    // capability; served as a plain file anywhere else, a normal link works.
    let saver=null;
    try{ saver = window.claude && claude.use ? await claude.use("downloads") : null; }catch(e){ saver=null; }
    if(saver){
      try{
        await saver.save({filename, data:blob});
        out.className="msg ok"; out.textContent="Spreadsheet saved.";
      }catch(err){
        if(err && err.code==="declined"){ out.className="msg warn"; out.textContent="Download cancelled."; }
        else { out.className="msg warn";
               out.textContent="Couldn't save the spreadsheet here. Use Print / Save as PDF — it gives the same pages."; }
      }
      return;
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    out.className="msg ok";
    out.textContent="Spreadsheet downloaded. If nothing appeared, your browser blocked it — use Print / Save as PDF instead.";
  }catch(e){
    out.className="msg err";
    out.textContent="Couldn't build the spreadsheet ("+e.message+"). Use Print / Save as PDF instead — it gives the same pages.";
  }
};
function mcasList(letters, ds){
  const names=[];
  for(let d=1;d<=6;d++) for(let p=1;p<=5;p++){
    const b=D.blockMap[d+"-"+p]; if(!b||letters.indexOf(b[0])<0) continue;
    const c=B.pick(d+"-"+p, ds); if(c&&names.indexOf(c.desc)<0) names.push(c.desc);
  }
  return names.length?names.join(", "):"—";
}
})();
