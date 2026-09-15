"use strict";
/* Prints a week to PDF the way a reader's browser would, and checks the colours
 * survive.
 *
 *     cd tests && node print-colour.js
 *
 * Chrome's print dialog ships with "Background graphics" OFF, so every fill in
 * the weekly table — the title bar, day headers, arrival and dismissal rows, the
 * course colours — is dropped unless the stylesheet says otherwise. The page then
 * prints as grey boxes with white-on-white headers. This drives Chrome over the
 * DevTools protocol with printBackground:false, which is exactly that default,
 * rasterises the result and measures how much colour is left.
 *
 * Needs Google Chrome and poppler's pdftoppm (brew install poppler / apt install
 * poppler-utils), so it is not part of `npm test`. The fast suite guards the CSS
 * rule itself; this one proves the rule does what it claims in a real browser.
 */
const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http");

const PORT = 9333;
const PAGE = path.join(__dirname, "..", "site", "index.html");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "hkp-print-"));
const MIN_COLOURED = 10;            // a coloured week sits near 18%; a stripped one near 0.8%

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser",
].find(p => { try { fs.accessSync(p); return true; } catch (e) { return false; } });

/* A copy of the built page that builds one week by itself, so the print has
   something on it. */
function selfDrivingCopy() {
  const src = fs.readFileSync(PAGE, "utf8");
  const driver = `
<script>
window.addEventListener("load",function(){
  setTimeout(function(){
    document.querySelector("#btnDemo").click();
    setTimeout(function(){
      document.querySelector("#range").value="thisweek";
      // measure a weekly page: the year calendar is mostly white by design and
      // would drag the average down for reasons that have nothing to do with
      // whether backgrounds print
      document.querySelector("#yearcal").checked=false;
      document.querySelector("#btnBuild").click();
    },300);
  },200);
});
</script>
</body>`;
  const out = path.join(TMP, "driven.html");
  fs.writeFileSync(out, src.replace("</body>", driver));
  return "file://" + out;
}

const req = (p, method) => new Promise((res, rej) => {
  const r = http.request({ host: "127.0.0.1", port: PORT, path: p, method: method || "GET" }, s => {
    let d = ""; s.on("data", c => d += c);
    s.on("end", () => { try { res(JSON.parse(d)); } catch (e) { res(d); } });
  });
  r.on("error", rej); r.end();
});

async function waitForChrome() {
  for (let i = 0; i < 40; i++) {
    try { await req("/json/version"); return; } catch (e) { await new Promise(r => setTimeout(r, 250)); }
  }
  throw new Error("Chrome did not open its debugging port");
}

async function printToPdf(url, outPdf, printBackground) {
  const WebSocket = require("ws");
  const target = await req("/json/new?about:blank", "PUT");
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0; const pending = new Map();
  const send = (method, params) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  await new Promise(r => ws.on("open", r));
  ws.on("message", buf => {
    const m = JSON.parse(buf);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  await send("Page.enable");
  await send("Page.navigate", { url });
  await new Promise(r => setTimeout(r, 3000));
  const { data } = await send("Page.printToPDF", {
    printBackground, landscape: true, paperWidth: 11, paperHeight: 8.5,
    preferCSSPageSize: true, displayHeaderFooter: false
  });
  fs.writeFileSync(outPdf, Buffer.from(data, "base64"));
  await req("/json/close/" + target.id);
  ws.close();
}

/* Share of pixels that are noticeably coloured rather than grey, black or white. */
function colouredShare(pdf) {
  const base = path.join(TMP, path.basename(pdf, ".pdf"));
  execFileSync("pdftoppm", ["-r", "60", "-f", "1", "-l", "1", pdf, base]);
  const ppm = fs.readdirSync(TMP).filter(f => f.startsWith(path.basename(base)) && f.endsWith(".ppm"))[0];
  const data = fs.readFileSync(path.join(TMP, ppm));
  let pos = 0, fields = [];
  while (fields.length < 4) {                       // P6, width, height, maxval
    while (data[pos] === 0x20 || data[pos] === 0x0a || data[pos] === 0x0d || data[pos] === 0x09) pos++;
    if (data[pos] === 0x23) { while (data[pos] !== 0x0a) pos++; continue; }
    let start = pos;
    while (pos < data.length && data[pos] > 0x20) pos++;
    fields.push(data.slice(start, pos).toString());
  }
  pos++;
  const w = +fields[1], h = +fields[2];
  let coloured = 0;
  for (let i = pos; i + 2 < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 18) coloured++;
  }
  return 100 * coloured / (w * h);
}

(async () => {
  if (!CHROME) { console.error("Google Chrome not found — skipping."); process.exit(0); }
  try { execFileSync("pdftoppm", ["-v"], { stdio: "ignore" }); }
  catch (e) { console.error("pdftoppm not found (brew install poppler) — skipping."); process.exit(0); }

  const chrome = spawn(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=" + PORT, "--user-data-dir=" + path.join(TMP, "profile")],
    { stdio: "ignore" });
  let code = 0;
  try {
    await waitForChrome();
    const url = selfDrivingCopy();
    const off = path.join(TMP, "backgrounds-off.pdf");
    await printToPdf(url, off, false);
    const share = colouredShare(off);
    const ok = share >= MIN_COLOURED;
    console.log("printed with Background graphics OFF — " + share.toFixed(2) + "% of the page is coloured");
    console.log(ok ? "  PASS  the week keeps its colours without the browser checkbox"
                   : "  FAIL  the week printed as grey boxes (expected at least " + MIN_COLOURED + "%)");
    code = ok ? 0 : 1;
  } catch (e) {
    console.error("print check failed to run: " + e.message);
    code = 1;
  } finally {
    chrome.kill();
    // Chrome writes to its profile as it shuts down; removing underneath it
    // raises ENOTEMPTY and would mask the result we just computed.
    await new Promise(r => { chrome.once("exit", r); setTimeout(r, 3000); });
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* temp dir, leave it */ }
  }
  process.exit(code);
})();
