# tests/

Browser-side regression tests. `workbooks/verify.py` audits the workbook half of
this project against the district's own block calendar; these audit the half that
runs in a family's browser.

```bash
npm install
npm test            # 51 assertions, a few seconds, no browser needed
npm run print-check # needs Google Chrome and pdftoppm
```

They drive **`site/index.html`** — the built, deployed artifact, not the modules
under `src/web/`. Run `cd src && python assemble.py` first, or you are testing the
previous build.

| file | what it does |
|---|---|
| `run.js` | Loads the page in jsdom and clicks through it: parsing, the step-2 warnings, both recurring notes, week ranges, the glance, escaping. Run by `npm test` and by CI. |
| `print-colour.js` | Drives real Chrome over the DevTools protocol, prints a week to PDF with **Background graphics off** — the print dialog's default — rasterises it and measures how much colour survived. |

`print-colour.js` is separate because it needs Chrome and poppler installed. The
fast suite asserts the `print-color-adjust` rule is present; this one proves it
does what it claims in a browser. Both exit non-zero on failure.

Each test here exists because something actually broke: a quote in a course title
truncating the field, a `ReferenceError` reachable only from one dropdown value, a
`district_data.json` that was a week behind the workbook, and a printed planner
that came out as grey boxes.
