# -*- coding: utf-8 -*-
"""Concatenate src/web/* + district_data.json into site/index.html.

    python assemble.py

Writes the deployable page. Nothing is minified or bundled — the output stays
a single readable file so anyone can audit it.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WEB = os.path.join(HERE, "web")


def read(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as f:
        return f.read()


def main():
    data = read(HERE, "district_data.json")
    head = read(WEB, "head.html")
    body = read(WEB, "body.html")
    app = read(WEB, "app.js")
    ui = read(WEB, "ui.js")
    xl = read(WEB, "xlsx.js")

    # ui.js defines helpers that xlsx.js uses, so it has to load first
    core = (head + "\n" + body
            + "\n<script>window.__DISTRICT__=" + data + ";</script>\n"
            + "<script>\n" + app + "\n</script>\n"
            + "<script>\n" + ui + "\n</script>\n"
            + "<script>\n" + xl + "\n</script>\n")

    before, _, after = core.partition("</style>")
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            + before + "</style>\n</head>\n<body>\n" + after + "\n</body>\n</html>\n")

    out = os.path.join(ROOT, "site", "index.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    print("wrote %s (%d KB)" % (os.path.relpath(out, ROOT), len(page) // 1024))


if __name__ == "__main__":
    main()
