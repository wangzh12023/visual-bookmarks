#!/usr/bin/env python3
"""Parse Chrome/Edge bookmarks HTML into src/data/bookmarks.json."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import OrderedDict
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "bookmarks.json"

WANTED_ROOTS = {"frontend", "latex template"}

# URL -> public path for curated preview screenshots
PREVIEW_MAP = {
    "https://allthingsn.com/apps/reverie/web/": "/previews/reverie.png",
    "https://ux-design-awards.com/winners/2026-1-birds-animate": "/previews/birds-animate.jpg",
}


class BookmarkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.stack: list[str] = []
        self.items: list[dict] = []
        self._pending_folder = None
        self._in_h3 = False
        self._h3_text = ""
        self._in_a = False
        self._a_href: str | None = None
        self._a_icon: str | None = None
        self._a_text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_d = {k: v for k, v in attrs}
        low = tag.lower()
        if low == "h3":
            self._in_h3 = True
            self._h3_text = ""
            self._pending_folder = attrs_d
        elif low == "dl":
            if self._pending_folder is not None:
                self.stack.append(self._h3_text.strip())
                self._pending_folder = None
        elif low == "a":
            self._in_a = True
            self._a_href = attrs_d.get("HREF") or attrs_d.get("href")
            self._a_icon = attrs_d.get("ICON") or attrs_d.get("icon")
            self._a_text = ""

    def handle_endtag(self, tag: str) -> None:
        low = tag.lower()
        if low == "h3":
            self._in_h3 = False
        elif low == "dl":
            if self.stack:
                self.stack.pop()
        elif low == "a":
            self._in_a = False
            self.items.append(
                {
                    "title": unescape(self._a_text.strip()),
                    "href": self._a_href,
                    "icon": self._a_icon,
                    "path": list(self.stack),
                }
            )

    def handle_data(self, data: str) -> None:
        if self._in_h3:
            self._h3_text += data
        if self._in_a:
            self._a_text += data


def clean_title(title: str, url: str) -> str:
    title = re.sub(r"\s+", " ", title).strip()
    for sep in [" — ", " - ", " | ", " · "]:
        if sep in title and len(title) > 60:
            title = title.split(sep)[0].strip()
            break
    if not title:
        title = urlparse(url).netloc or "Untitled"
    return title


def host_of(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


def resolve_preview(url: str | None) -> str | None:
    if not url:
        return None
    if url in PREVIEW_MAP:
        return PREVIEW_MAP[url]
    for key, value in PREVIEW_MAP.items():
        if url.rstrip("/") == key.rstrip("/") or url.startswith(key.rstrip("/")):
            return value
    return None


def ensure_tree(nested: dict, parts: list[str]) -> None:
    cur = nested
    for i, part in enumerate(parts):
        path = "/".join(parts[: i + 1])
        if path not in cur:
            cur[path] = {"name": part, "path": path, "count": 0, "children": OrderedDict()}
        cur[path]["count"] += 1
        cur = cur[path]["children"]


def tree_to_list(node: dict) -> list[dict]:
    return [
        {
            "name": v["name"],
            "path": v["path"],
            "count": v["count"],
            "children": tree_to_list(v["children"]),
        }
        for v in node.values()
    ]


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/parse-bookmarks.py /path/to/bookmarks.html")
        sys.exit(1)

    src = Path(sys.argv[1])
    html = src.read_text(encoding="utf-8", errors="replace")
    parser = BookmarkParser()
    parser.feed(html)

    selected = [
        it
        for it in parser.items
        if len(it["path"]) >= 3
        and it["path"][1] == "Avocation"
        and it["path"][2] in WANTED_ROOTS
    ]

    out: list[dict] = []
    seen: set[str] = set()
    nested: dict = OrderedDict()

    for it in selected:
        url = it["href"] or ""
        key = f"{url}|{it['title']}"
        if key in seen:
            continue
        seen.add(key)

        parts = it["path"][2:]
        slug = hashlib.md5((url or it["title"]).encode()).hexdigest()[:10]
        item = {
            "id": f"bm-{slug}",
            "title": clean_title(it["title"], url),
            "url": url,
            "host": host_of(url),
            "category": parts[0],
            "subcategory": parts[1:],
            "path": "/".join(parts),
            "preview": resolve_preview(url),
            "favicon": it["icon"] if it.get("icon") and str(it["icon"]).startswith("data:") else None,
        }
        out.append(item)
        ensure_tree(nested, parts)

    data = {
        "meta": {
            "title": "Visual Bookmarks",
            "description": "Visual walkthrough of Avocation frontend & LaTeX template collections",
            "total": len(out),
            "withPreview": sum(1 for x in out if x["preview"]),
        },
        "categories": tree_to_list(nested),
        "items": out,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} items ({data['meta']['withPreview']} with preview) -> {OUT}")


if __name__ == "__main__":
    main()
