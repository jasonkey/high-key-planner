"use strict";
/* Browser-side regression tests for site/index.html.
 *
 * verify.py audits the workbook half of this project against the district's own
 * block calendar. Nothing audited the browser half, and the two implementations
 * are only ever as consistent as someone remembered to make them. These tests
 * drive the built page — the real artifact, not the source modules — through
 * jsdom and assert what a family would actually see.
 *
 *     cd tests && npm install && npm test
 *
 * They run against site/index.html, so run assemble.py first if you have edited
 * anything under src/web/.
 */
const { JSDOM } = require("jsdom");
const path = require("path");

const PAGE = path.join(__dirname, "..", "site", "index.html");
const DEMO_ROW = 'VA1000-01\tStudio Art\tFY\tC Block\t2(2,5) 3(3,6)\tChen, L.';
const DEMO_FULL = [
  "WL1000-01\tSpanish 2\tFY\tA(2,4)\t1(3) 2(6)\tAdams, R.",
  "EN1000-01\tEnglish 9\tFY\tB Block\t1(2,4,6) 2(3)\tBrooks, T.",
  "VA1000-01\tStudio Art\tFY\tC Block\t2(2,5) 3(3,6)\tChen, L.",
  "SC1000-01\tBiology\tFY\tD Block\t2(1,4) 3(2,5)\tDiaz, M.",
  "WE1000-01\tHealth & Wellness\tS1\tE Block\t3(1) 4(2,4,6)\tEllis, J.",
  "MA1000-01\tAlgebra 1\tFY\tF Block\t3(4) 4(1) 5(2,5)\tFord, K.",
  "SO1000-01\tUS History\tFY\tG Block\t4(3,5) 5(1,4)\tGray, S.",
  "HR1000-01\tAdvisory\tFY\tT Block\t5(3,6)\tHall, P.",
].join("\n");

let passed = 0;
const failures = [];

function suite(name) { console.log("\n" + name); }
function ok(name, cond, detail) {
  if (cond) { passed++; console.log("  PASS  " + name + (detail ? "  — " + detail : "")); }
  else { failures.push(name); console.log("  FAIL  " + name + (detail ? "  — " + detail : "")); }
}

/* Load the built page. fakeNow pins Date so the relative ranges can be tested
   from a chosen point in the year. */
async function load(opts) {
  const fakeNow = opts && opts.fakeNow;
  const errs = [];
  const dom = await JSDOM.fromFile(PAGE, {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
    url: "http://localhost/",
    beforeParse(w) {
      w.scrollTo = () => {};
      w.print = () => {};
      w.URL.createObjectURL = () => "blob:stub";
      w.Element.prototype.scrollIntoView = function () {};
      w.addEventListener("error", e => errs.push((e.error && e.error.message) || e.message));
      if (fakeNow) {
        const Real = w.Date;
        class Fixed extends Real {
          constructor(...a) { super(...(a.length ? a : [fakeNow])); }
          static now() { return fakeNow; }
        }
        w.Date = Fixed;
      }
    }
  });
  const w = dom.window;
  await new Promise(r => w.addEventListener("load", r));
  await pause(300);
  return { w, d: w.document, $: s => w.document.querySelector(s), errs };
}
const pause = (ms = 200) => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ */

async function testLoads() {
  suite("page loads");
  const { d, $, errs, w } = await load();
  ok("scripts run with no errors", errs.length === 0, errs[0] || d.title);
  ok("app.js published __BHS__", !!w.__BHS__, w.__BHS__ ? Object.keys(w.__BHS__).length + " exports" : "missing");
  ok("ui.js ran to completion (__WEEKS__)", typeof w.__WEEKS__ === "function");
  ok("xlsx.js ran (__XLSX__)", typeof w.__XLSX__ === "function");
  ok("no screenshot/OCR UI remains", !$("#drop") && !$("#shotSection") && !$("#btnRead"));
  ok("every #id the JS asks for exists", danglingIds(d).length === 0, danglingIds(d).join(", "));
}

/* The trap when removing UI: markup goes, the wiring that references it stays. */
function danglingIds(d) {
  const ids = new Set([...d.querySelectorAll("[id]")].map(e => e.id));
  const src = [...d.querySelectorAll("script")].map(s => s.textContent).join("\n");
  const missing = new Set();
  for (const m of src.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)) if (!ids.has(m[1])) missing.add(m[1]);
  for (const m of src.matchAll(/getElementById\("([^"]+)"\)/g)) if (!ids.has(m[1])) missing.add(m[1]);
  return [...missing];
}

async function testEscaping() {
  suite("esc() — quotes in user text");
  const { d, $ } = await load();
  $("#paste").value = 'WE1000-01\tShop 12" Ruler\tFY\tE Block\t3(1) 4(2,4,6)\tEllis, J.';
  $("#btnParse").click(); await pause();
  const inp = d.querySelector('#editRows input[data-f="desc"]');
  ok("a double quote survives the course title", inp && inp.value === 'Shop 12" Ruler', inp && JSON.stringify(inp.value));

  const B = d.defaultView.__BHS__;
  B.COURSES[0].notes.push({ text: 'Bring 12" ruler & <tape>', scope: "all" });
  const add = d.querySelector("#editRows button[data-add]");
  if (add) { add.click(); await pause(120); }
  const notes = [...d.querySelectorAll('#editRows input[data-k="text"]')].map(n => n.value);
  ok("quote, ampersand and angle brackets survive a re-render",
    notes.some(v => v === 'Bring 12" ruler & <tape>'), JSON.stringify(notes));
  ok("no event handler is injected into an input",
    d.querySelectorAll("#editRows input[onfocus], #editRows input[onerror]").length === 0);
}

async function testTermWarning() {
  suite("terms the planner cannot place");
  const { $ } = await load();
  const parse = async rows => { $("#paste").value = rows; $("#btnParse").click(); await pause(); };

  await parse("EN0720-01\tHumanities Seminar\tQ2\tC Block\t2(2,5) 3(3,6)\tChen, L.");
  ok("a Q2 course warns", $("#termNote").style.display === "block");
  await parse("EN0820-01\tComparative Writing\tS3\tC Block\t2(2,5) 3(3,6)\tChen, L.");
  ok("an S3 course warns", $("#termNote").style.display === "block");
  await parse(DEMO_ROW);
  ok("an ordinary FY course does not warn", $("#termNote").style.display === "none");
}

async function testNotesClear() {
  suite("warnings clear when they no longer apply");
  const { $ } = await load();
  $("#paste").value = "ST9000-01\tWinter Track\tS2\tPM\tPM(2,4)\tGray, S.";
  $("#btnParse").click(); await pause();
  const shown = $("#pmNote").style.display === "block";
  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  ok("the PM-block warning is shown, then cleared on re-parse",
    shown && $("#pmNote").style.display === "none");
}

async function testTimeParsing() {
  suite("recurring-note times");
  const { d, $ } = await load();
  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  $("#bsWhat").value = "Breakfast";

  for (const [input, want] of [["7:00 AM", "7:00 AM"], ["7am", "7:00 AM"], ["7:00", "7:00 AM"],
                               ["07:00", "7:00 AM"], ["19:00", "7:00 PM"]]) {
    $("#bsTime").value = input; $("#btnBuild").click(); await pause(220);
    ok("before-school " + JSON.stringify(input) + " reads as " + want,
      d.getElementById("printArea").textContent.includes(want));
  }
  $("#evWhat").value = "Dinner"; $("#evTime").value = "6:15"; $("#bsTime").value = "7:00";
  $("#btnBuild").click(); await pause(220);
  ok('a bare "6:15" in the evening row reads as PM',
    d.getElementById("printArea").textContent.includes("6:15 PM"));

  $("#bsTime").value = "half seven"; $("#btnBuild").click(); await pause(220);
  ok("an unreadable time says so instead of dropping the row",
    $("#noteMsg").style.display === "block");
  $("#bsTime").value = "7:00"; $("#btnBuild").click(); await pause(220);
  ok("the message clears once the time is readable", $("#noteMsg").style.display === "none");
}

async function testRecurringNoteDays() {
  suite("both recurring notes take day checkboxes");
  const { d, $ } = await load();
  ok("the evening row has five checkboxes", d.querySelectorAll("#evDays input").length === 5);
  ok("the same number as the morning row",
    d.querySelectorAll("#bsDays input").length === d.querySelectorAll("#evDays input").length);
  ok("all days start checked", [...d.querySelectorAll("#evDays input")].every(i => i.checked));

  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  $("#evTime").value = "6:15 PM"; $("#evWhat").value = "DINNER"; $("#evening").value = "22";
  $("#range").value = "thisweek";
  d.querySelector("#evd2").checked = false; d.querySelector("#evd4").checked = false;
  $("#btnBuild").click(); await pause(450);

  const row = [...d.querySelectorAll("#printArea tr")].find(tr => tr.textContent.includes("DINNER"));
  ok("the evening note renders", !!row);
  if (row) {
    const cells = [...row.children].map(td => td.textContent.trim());
    ok("the label column carries the time, not the text", cells[0] === "6:15 PM", cells[0]);
    ok("only the chosen days carry the text",
      cells[1] === "DINNER" && cells[2] === "" && cells[3] === "DINNER" && cells[4] === "" && cells[5] === "DINNER",
      cells.slice(1, 6).map(c => c || "·").join("|"));
    const cls = [...row.children].map(td => td.className);
    ok("only the chosen days are highlighted",
      cls[1].includes("dinner") && !cls[2].includes("dinner"));
  }
  [...d.querySelectorAll("#evDays input")].forEach(i => { i.checked = false; });
  $("#btnBuild").click(); await pause(450);
  ok("no days checked drops the row entirely",
    ![...d.querySelectorAll("#printArea tr")].some(tr => tr.textContent.includes("DINNER")));
}

async function testGlanceOrder() {
  suite("at a glance — ordered from this week");

  /* Wed 30 Sep 2026: the week runs Mon=Day 2 through Fri=Day 6, so Day 1 is the
     one rotation day that does not occur. It used to lead the table. */
  {
    const { d, $ } = await load({ fakeNow: Date.UTC(2026, 8, 30, 12) });
    $("#paste").value = DEMO_FULL; $("#btnParse").click(); await pause();
    $("#btnBuild").click(); await pause(500);
    const heads = [...d.querySelectorAll("#atGlance thead th")].slice(1);
    const days = heads.map(h => (h.textContent.match(/DAY (\d)/) || [])[1]);
    ok("columns start at this week's first rotation day",
      days.join("") === "234561", "DAY " + days.join(", "));
    ok("each column names the weekday it falls on this week",
      heads[0].textContent.includes("Mon") && heads[2].textContent.includes("Wed"),
      heads.map(h => h.textContent.replace(/DAY \d/, "").trim()).join(" | "));
    ok("the day that does not occur says so",
      /not this week/.test(heads[5].textContent), heads[5].textContent);
    ok("the caption explains the ordering",
      /Columns start with this week's first school day/.test($("#glanceTerm").textContent));
  }

  /* A week whose Monday is a holiday still orders from the first day that runs. */
  {
    const { d, $ } = await load({ fakeNow: Date.UTC(2026, 9, 12, 12) });
    $("#paste").value = DEMO_FULL; $("#btnParse").click(); await pause();
    $("#btnBuild").click(); await pause(500);
    const first = (d.querySelector("#atGlance thead th:nth-child(2)").textContent.match(/DAY (\d)/) || [])[1];
    ok("a closed Monday is skipped for the ordering", first === "6", "starts at DAY " + first);
  }
}

async function testGlance() {
  suite("at a glance");
  const { $ } = await load();
  $("#paste").value = ["SC3000-01\tChemistry\tS2\tF Block\t3(4) 4(1) 5(2,5)\tFord, K.",
                       "EN1000-01\tEnglish 9\tS1\tB Block\t1(2,4,6) 2(3)\tBrooks, T."].join("\n");
  $("#btnParse").click(); await pause();
  $("#btnBuild").click(); await pause(450);
  const cap = $("#glanceTerm").textContent;
  ok("the caption names the semester and the date it is showing",
    /Semester [12], the courses that run on/.test(cap), cap.slice(0, 70));
  ok("it names the course from the other semester so it is not thought missing",
    /Chemistry|English 9/.test(cap));
}

async function testRanges() {
  suite("week ranges");
  const { d, $ , errs } = await load();
  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  for (const mode of ["all", "thisweek", "lastweek", "next4", "rest", "sem1", "sem2", "thismonth"]) {
    $("#range").value = mode; $("#btnBuild").click(); await pause(200);
    ok(mode + " builds without error", errs.length === 0, errs[0] || $("#outInfo").textContent);
  }
  $("#range").value = "all"; $("#btnBuild").click(); await pause(600);
  const txt = d.getElementById("printArea").textContent;
  ok("the Jun 28 snow make-up week has a page", txt.includes("June 28, 2027"));
  ok("it is marked as a make-up day", txt.includes("SNOW MAKE-UP"));
  ok("the whole year is 42 pages", /42 pages/.test($("#outInfo").textContent),
    $("#outInfo").textContent);
}

async function testYearCalendar() {
  /* The year-at-a-glance page has no checkbox at the moment — ui.js publishes
     __YEARCAL__ so it stays exercised while it is off the page. If it is ever
     restored to the UI, add a test that the control shows it. */
  suite("year at a glance (built, but not offered in the UI)");
  const { d, $, w } = await load();
  ok("no control for it on the page", !d.querySelector("#yearcal"));
  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  $("#range").value = "thisweek"; $("#btnBuild").click(); await pause(500);
  ok("nothing prepends it to the print output", !d.querySelector("#printArea .ycgrid"));

  ok("the renderer is still reachable", typeof w.__YEARCAL__ === "function");
  if (typeof w.__YEARCAL__ !== "function") return;

  const holder = d.createElement("div");
  holder.innerHTML = w.__YEARCAL__("HIGH KEY  ·  BHS WEEKLY PLANNER");
  const months = holder.querySelectorAll(".ycmonth");
  ok("ten months, September to June", months.length === 10, months.length + " months");
  ok("weekday columns only", months[0].querySelectorAll("thead th").length === 5);

  const DD = w.__DISTRICT__;
  const schoolDays = Object.keys(DD.dayNum).length;
  ok("every school day carries a rotation day",
    holder.querySelectorAll(".ycgrid .ycd").length === schoolDays,
    holder.querySelectorAll(".ycgrid .ycd").length + " stamped of " + schoolDays);

  const sept = [...months].find(m => m.textContent.startsWith("September"));
  const cell = [...sept.querySelectorAll("td")].find(td => {
    const n = td.querySelector(".ycn"); return n && n.textContent === "14";
  });
  ok("Sep 14 2026 is stamped Day 5", cell && cell.querySelector(".ycd")
    && cell.querySelector(".ycd").textContent === "5");

  const weekdayClosed = Object.keys(DD.closed)
    .filter(ds => { const wd = new Date(ds + "T00:00:00Z").getUTCDay(); return wd >= 1 && wd <= 5; }).length;
  ok("every weekday closure is shaded",
    holder.querySelectorAll("td.ycoff").length === weekdayClosed,
    holder.querySelectorAll("td.ycoff").length + " of " + weekdayClosed);

  /* A bare .ycoff (0,1,0) loses to .ycmonth td (0,1,1), which silently blanked
     every shaded day once. getComputedStyle cannot settle it — jsdom takes the
     last matching rule rather than resolving specificity. */
  const sheet = [...d.querySelectorAll("style")].map(x => x.textContent).join("\n");
  const shades = ["ycoff", "ycearly", "ycexam", "ycmcas", "ycsnow", "yclast"];
  const weak = shades.filter(c => !new RegExp("\\.ycmonth td\\." + c + "\\b").test(sheet));
  ok("its styles are still present and outrank the cell default", weak.length === 0,
    weak.length ? "missing or too weak: ." + weak.join(", .") : shades.length + " checked");

  ok("it says it is not an official publication",
    /Not an official school publication/.test(holder.querySelector(".ycfoot").textContent));
}

async function testRangesAfterYearEnd() {
  suite("week ranges once the year is over (clock faked to 15 Jul 2027)");
  const { d, $ } = await load({ fakeNow: Date.UTC(2027, 6, 15, 12) });
  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  for (const [mode, want] of [["thisweek", "June 28, 2027"], ["lastweek", "June 21, 2027"],
                              ["next4", "June 28, 2027"], ["rest", "June 28, 2027"]]) {
    $("#range").value = mode; $("#btnBuild").click(); await pause(300);
    const txt = d.getElementById("printArea").textContent;
    ok(mode + " lands on " + want + ", not the start of the year",
      txt.includes(want) && !txt.includes("September 14, 2026"));
  }
}

async function testDebounce() {
  suite("typing a note does not rebuild the year per keystroke");
  const { d, $ } = await load();
  $("#paste").value = DEMO_ROW; $("#btnParse").click(); await pause();
  $("#btnBuild").click(); await pause(300);
  const add = d.querySelector("#editRows button[data-add]");
  if (!add) { ok("could not reach the note editor", false); return; }
  add.click(); await pause(120);
  const input = d.querySelector('#editRows input[data-k="text"]');
  const area = d.getElementById("printArea");
  area.innerHTML = "";
  for (const ch of "lab coat") {
    input.value += ch;
    input.dispatchEvent(new d.defaultView.Event("input", { bubbles: true }));
  }
  const immediate = area.innerHTML.length;
  await pause(500);
  ok("eight keystrokes cause no synchronous rebuild", immediate === 0, immediate + " chars immediately after");
  ok("one rebuild lands after the pause", area.innerHTML.length > 0);
}

async function testRightNow() {
  suite("right now — today, tomorrow and this week");

  /* Every case pins the clock, because the whole card is a function of the date. */
  const at = async ms => {
    const ctx = await load({ fakeNow: ms });
    ctx.$("#paste").value = DEMO_FULL; ctx.$("#btnParse").click(); await pause(250);
    return ctx;
  };
  const text = el => el.textContent.replace(/\s+/g, " ").trim();

  // Wed 30 Sep 2026 is a Day 4; the next day is a Day 5 with a 9:37 late start.
  {
    const { d, $ } = await at(Date.UTC(2026, 8, 30, 12));
    ok("the card appears once a schedule is read", $("#nowCard").style.display === "block");
    const today = text(d.querySelector("#nowToday"));
    ok("today names the date and rotation day", /Wednesday, September 30, 2026/.test(today) && /DAY 4/.test(today));
    ok("today gives arrival and dismissal", /Arrive 8:20 AM/.test(today) && /Home 3:05 PM/.test(today));
    ok("today lists its periods", d.querySelectorAll("#nowToday .nowper tr").length === 6,
      d.querySelectorAll("#nowToday .nowper tr").length + " rows");
    const tom = text(d.querySelector("#nowTomorrow"));
    ok("tomorrow is the next day, with its late start flagged",
      /Thursday, October 1, 2026/.test(tom) && /DAY 5/.test(tom) && /LATE START/.test(tom));
    ok("the week strip covers Mon to Fri", d.querySelectorAll("#nowWeek thead th").length === 6,
      "1 label + " + (d.querySelectorAll("#nowWeek thead th").length - 1) + " days");
    ok("today's column is marked", d.querySelectorAll("#nowWeek .nwtoday").length > 0);
    ok("the week names its range", /September 28, 2026 to October 2, 2026/.test($("#nowWeekLab").textContent));
  }

  // Saturday: no school, and the useful answer is when school next starts.
  {
    const { d, $ } = await at(Date.UTC(2026, 9, 3, 12));
    const today = text(d.querySelector("#nowToday"));
    ok("a Saturday says there is no school", /No school/.test(today));
    ok("and names the next school day with its time",
      /Next school day: Monday, October 5, 2026 — Day 1, arrive 9:37 AM/.test(today), today.slice(0, 110));
    ok("on a weekend the strip shows the week ahead",
      /^Next week/.test($("#nowWeekLab").textContent), $("#nowWeekLab").textContent);
  }

  // A holiday names itself rather than just going blank.
  {
    const { d } = await at(Date.UTC(2026, 9, 12, 12));
    const today = text(d.querySelector("#nowToday"));
    ok("a closure names itself", /SCHOOL CLOSED/.test(today) && /Indigenous Peoples' Day/.test(today));
    ok("and still points at the next school day", /Next school day: Tuesday, October 13, 2026/.test(today));
  }

  // Exam days are school days with no published times — never invent one.
  {
    const { d } = await at(Date.UTC(2027, 0, 25, 12));
    const tom = text(d.querySelector("#nowTomorrow"));
    ok("an exam day says the schedule is not published",
      /MIDTERM EXAMS/.test(tom) && /not published/.test(tom));
    ok("and gives no arrival time for it", !/Arrive \d/.test(tom));
  }

  // Day 6 dismisses early — the card has to say so.
  {
    const { d } = await at(Date.UTC(2026, 9, 13, 12));
    const today = text(d.querySelector("#nowToday"));
    ok("a Day 6 flags the early dismissal", /DAY 6/.test(today) && /EARLY/.test(today), today.slice(0, 80));
  }

  // Out of term: say so, and drop the empty week strip.
  {
    const { d, $ } = await at(Date.UTC(2027, 6, 15, 12));
    ok("after the year it says the year is over",
      /school year is over/.test(text(d.querySelector("#nowToday"))));
    ok("and the empty week strip is hidden", $("#nowWeekWrap").style.display === "none");
  }
}

async function testDonationNote() {
  suite("the ask");
  const { d } = await load();
  const box = d.querySelector(".give");
  ok("the note sits in the Good to know card", !!box && !!box.closest(".card"));
  ok("it is above the bullets, not below",
    !!box && !!(box.compareDocumentPosition(box.closest(".card").querySelector("ul")) &
                d.defaultView.Node.DOCUMENT_POSITION_FOLLOWING));
  const link = d.querySelector(".give a");
  ok("it links somewhere", !!link, link && link.textContent);

  /* A dead href on a public page is worse than no link at all, and a placeholder
     is exactly the kind of thing that ships by accident. */
  const href = link ? link.getAttribute("href") : "";
  ok("the link is a real URL, not a placeholder", /^https:\/\/\S+\.\S+/.test(href), href);
  ok("it opens in a new tab without leaking the referrer",
    link && link.getAttribute("target") === "_blank" &&
    /noopener/.test(link.getAttribute("rel") || ""));
}

/* jsdom does not evaluate @media print, so this guards the rule itself. Without
   it the browser drops every background colour unless the reader happens to tick
   "Background graphics", and the printed week comes out as grey boxes.
   tests/print-colour.sh measures the real PDF. */
async function testPrintColour() {
  suite("print colour");
  const { d } = await load();
  const css = [...d.querySelectorAll("style")].map(s => s.textContent).join("\n");
  const printBlock = css.slice(css.indexOf("@media print"));
  ok("print-color-adjust is set", /print-color-adjust\s*:\s*exact/.test(printBlock));
  ok("the -webkit- prefix is there too, for Safari",
    /-webkit-print-color-adjust\s*:\s*exact/.test(printBlock));
  ok("it is scoped to the printed area", /#printArea[^{]*\{[^}]*print-color-adjust/.test(printBlock));
}

/* ------------------------------------------------------------------ */

(async () => {
  const all = [testLoads, testEscaping, testTermWarning, testNotesClear, testTimeParsing,
               testRecurringNoteDays, testGlance, testGlanceOrder, testRanges, testRangesAfterYearEnd,
               testDebounce, testYearCalendar, testRightNow, testDonationNote, testPrintColour];
  for (const t of all) {
    try { await t(); }
    catch (e) { failures.push(t.name + " threw"); console.log("  FAIL  " + t.name + " threw — " + e.message); }
  }
  console.log("\n" + passed + " passed, " + failures.length + " failed");
  if (failures.length) { failures.forEach(f => console.log("  - " + f)); process.exit(1); }
})();
