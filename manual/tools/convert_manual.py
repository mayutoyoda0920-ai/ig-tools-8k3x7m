#!/usr/bin/env python3
"""
ignis-manual.html -> data/manual.js (window.MANUAL_DATA)

本文テキストは一字一句変更しない。構造の再配置のみ行う。
変換後に「原文の全テキスト」と「生成データの全テキスト」を突き合わせて検証する。

usage:  python3 tools/convert_manual.py [--check-only]
"""
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "ignis-manual.html"          # repo root の既存マニュアル
OUT = ROOT / "data" / "manual.js"

VOID = {"br", "img", "meta", "link", "input", "hr", "source", "area", "base", "col"}


# ---------------------------------------------------------------- parser
class Node:
    __slots__ = ("tag", "attrs", "children", "text")

    def __init__(self, tag=None, attrs=None, text=None):
        self.tag = tag
        self.attrs = attrs or []
        self.children = []
        self.text = text

    def cls(self):
        for k, v in self.attrs:
            if k == "class":
                return (v or "").split()
        return []

    def attr(self, name):
        for k, v in self.attrs:
            if k == name:
                return v
        return None


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = Node("#root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(Node(None, text=data))

    def handle_entityref(self, name):
        self.stack[-1].children.append(Node(None, text=f"&{name};"))

    def handle_charref(self, name):
        self.stack[-1].children.append(Node(None, text=f"&#{name};"))

    def handle_comment(self, data):
        pass


# ---------------------------------------------------------------- serialize
def serialize(node):
    if node.tag is None:
        return node.text or ""
    if node.tag == "#root":
        return "".join(serialize(c) for c in node.children)
    attrs = "".join(
        f' {k}="{v}"' if v is not None else f" {k}" for k, v in node.attrs
    )
    if node.tag in VOID:
        return f"<{node.tag}{attrs}>"
    inner = "".join(serialize(c) for c in node.children)
    return f"<{node.tag}{attrs}>{inner}</{node.tag}>"


def inner_html(node):
    return "".join(serialize(c) for c in node.children).strip()


def text_of(node):
    if node.tag is None:
        return node.text or ""
    if node.tag == "br":
        return "\n"
    return "".join(text_of(c) for c in node.children)


def elements(node):
    return [c for c in node.children if c.tag]


def find(node, tag):
    for c in node.children:
        if c.tag == tag:
            return c
        r = find(c, tag)
        if r:
            return r
    return None


def find_all(node, tag, cls=None):
    out = []

    def walk(n):
        for c in n.children:
            if c.tag == tag and (cls is None or cls in c.cls()):
                out.append(c)
            walk(c)

    walk(node)
    return out


# ---------------------------------------------------------------- splitting
def is_check_p(node):
    """<p><strong>確認：</strong>...</p> かどうか"""
    if node.tag != "p":
        return False
    return text_of(node).strip().startswith("確認：")


def is_warning(node):
    return node.tag == "div" and "warning" in node.cls()


def split_work_check(nodes):
    """作業カラム / 確認カラム に振り分ける。
    確認 = 「確認：」で始まる段落 + warning（注意点・よくある間違い）
    作業 = それ以外すべて
    """
    work, check = [], []
    for n in nodes:
        if n.tag is None and not (n.text or "").strip():
            continue
        (check if (is_check_p(n) or is_warning(n)) else work).append(n)
    return (
        "".join(serialize(n) for n in work).strip(),
        "".join(serialize(n) for n in check).strip(),
    )


# ---------------------------------------------------------------- blocks
def build_steps(ol):
    items = []
    for li in [c for c in ol.children if c.tag == "li"]:
        kids = list(li.children)
        title = ""
        # 先頭の <strong> を手順名として取り出す
        for i, c in enumerate(kids):
            if c.tag is None and not (c.text or "").strip():
                continue
            if c.tag == "strong":
                title = text_of(c).strip()
                kids = kids[:i] + kids[i + 1:]
            break
        work, check = split_work_check(kids)
        items.append({"title": title, "work": work, "check": check})
    return {"type": "steps", "items": items}


def build_checklist(ul):
    return {
        "type": "checklist",
        "items": [inner_html(li) for li in ul.children if li.tag == "li"],
    }


def build_pillars(div):
    items = []
    for card in find_all(div, "div", "pillar-card"):
        num = title = desc = ""
        for c in elements(card):
            k = c.cls()
            if "pillar-number" in k:
                num = text_of(c).strip()
            elif "pillar-title" in k:
                title = text_of(c).strip()
            elif "pillar-desc" in k:
                desc = text_of(c).strip()
        items.append({"number": num, "title": title, "desc": desc})
    return {"type": "pillars", "items": items}


def build_blocks(nodes):
    """h3 で小見出しに区切りつつ、ブロック列を作る"""
    blocks = []
    pending = []          # h3 に属さない、直前までの素のノード

    def flush_plain():
        nonlocal pending
        if not pending:
            return
        work, check = split_work_check(pending)
        if work or check:
            blocks.append({"type": "free", "work": work, "check": check})
        pending = []

    i = 0
    while i < len(nodes):
        n = nodes[i]
        if n.tag is None:
            if (n.text or "").strip():
                pending.append(n)
            i += 1
            continue

        if n.tag == "h3":
            flush_plain()
            title = text_of(n).strip()
            body = []
            i += 1
            while i < len(nodes) and nodes[i].tag != "h3":
                body.append(nodes[i])
                i += 1
            sub_blocks = build_sub(body)
            blocks.append({"type": "subsection", "title": title, "blocks": sub_blocks})
            continue

        if n.tag == "ol" and "step-list" in n.cls():
            flush_plain()
            blocks.append(build_steps(n))
        elif n.tag == "ul" and "checklist" in n.cls():
            flush_plain()
            blocks.append(build_checklist(n))
        elif n.tag == "div" and "pillars" in n.cls():
            flush_plain()
            blocks.append(build_pillars(n))
        elif n.tag == "table":
            flush_plain()
            blocks.append({"type": "table", "html": serialize(n)})
        else:
            pending.append(n)
        i += 1

    flush_plain()
    return blocks


def build_sub(nodes):
    """小見出し配下。steps / checklist / table は独立ブロック、他は work/check に振り分け"""
    blocks = []
    pending = []

    def flush():
        nonlocal pending
        if not pending:
            return
        work, check = split_work_check(pending)
        if work or check:
            blocks.append({"type": "free", "work": work, "check": check})
        pending = []

    for n in nodes:
        if n.tag is None:
            if (n.text or "").strip():
                pending.append(n)
            continue
        if n.tag == "ol" and "step-list" in n.cls():
            flush()
            blocks.append(build_steps(n))
        elif n.tag == "ul" and "checklist" in n.cls():
            flush()
            blocks.append(build_checklist(n))
        elif n.tag == "div" and "pillars" in n.cls():
            flush()
            blocks.append(build_pillars(n))
        elif n.tag == "table":
            flush()
            blocks.append({"type": "table", "html": serialize(n)})
        else:
            pending.append(n)
    flush()
    return blocks


# ---------------------------------------------------------------- section
def build_section(sec):
    sid = sec.attr("id")
    h2 = find(sec, "h2")
    title = text_of(h2).strip() if h2 else sid

    nodes = [c for c in sec.children if not (c is h2)]

    # 冒頭の「完成形」note を goal として取り出す
    goal = ""
    rest = []
    goal_taken = False
    for n in nodes:
        if (
            not goal_taken
            and n.tag == "div"
            and "note" in n.cls()
            and "完成形" in text_of(n)
        ):
            goal = inner_html(n)
            goal_taken = True
            continue
        rest.append(n)

    status = "ready"
    if any(n.tag == "p" and "coming-soon" in n.cls() for n in rest) and len(
        [n for n in rest if n.tag]
    ) == 1:
        status = "coming-soon"

    blocks = build_blocks(rest)
    return {
        "id": sid,
        "title": title,
        "status": status,
        "goal": goal,
        "blocks": blocks,
    }


# ---------------------------------------------------------------- verify
WS = re.compile(r"\s+")


def norm_chunks(html_or_text, is_html=True):
    """テキストを正規化した断片リストにする（空白差は無視、文字は厳密）"""
    if is_html:
        t = re.sub(r"<br\s*/?>", "\n", html_or_text)
        t = re.sub(r"<[^>]+>", "\n", t)
    else:
        t = html_or_text
    t = (
        t.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    parts = [WS.sub(" ", p).strip() for p in t.split("\n")]
    return [p for p in parts if p]


def collect_data_text(data):
    out = []
    for s in data["sections"]:
        out.append(s["title"])
        out += norm_chunks(s["goal"])
        out += walk_blocks(s["blocks"])
    return out


def walk_blocks(blocks):
    out = []
    for b in blocks:
        t = b["type"]
        if t == "subsection":
            out.append(b["title"])
            out += walk_blocks(b["blocks"])
        elif t == "steps":
            for it in b["items"]:
                if it["title"]:
                    out.append(it["title"])
                out += norm_chunks(it["work"])
                out += norm_chunks(it["check"])
        elif t == "checklist":
            for it in b["items"]:
                out += norm_chunks(it)
        elif t == "pillars":
            for it in b["items"]:
                out += [it["number"], it["title"], it["desc"]]
        elif t == "table":
            out += norm_chunks(b["html"])
        elif t == "free":
            out += norm_chunks(b["work"])
            out += norm_chunks(b["check"])
    return [x for x in out if x]


def verify(main_node, data):
    src = norm_chunks(serialize(main_node))
    got = collect_data_text(data)
    a, b = Counter(src), Counter(got)
    missing = a - b
    extra = b - a
    return missing, extra, len(src), len(got)


# ---------------------------------------------------------------- main
def main():
    html = SRC.read_text(encoding="utf-8")
    tb = TreeBuilder()
    tb.feed(html)

    main_node = find(tb.root, "main")
    if main_node is None:
        sys.exit("ERROR: <main> が見つかりません")

    sections = [c for c in main_node.children if c.tag == "section"]
    data = {"title": "ignis manual", "sections": [build_section(s) for s in sections]}

    missing, extra, n_src, n_got = verify(main_node, data)

    print(f"sections : {len(data['sections'])}")
    print(f"原文の断片 : {n_src}")
    print(f"生成の断片 : {n_got}")

    ok = not missing and not extra
    if missing:
        print(f"\n[欠落] 原文にあって生成に無い ({sum(missing.values())}件):")
        for k, v in list(missing.items())[:20]:
            print(f"   x{v}  {k[:100]}")
    if extra:
        print(f"\n[余分] 生成にあって原文に無い ({sum(extra.values())}件):")
        for k, v in list(extra.items())[:20]:
            print(f"   x{v}  {k[:100]}")

    print("\n検証結果 :", "OK 原文と完全一致" if ok else "NG 差分あり")

    if "--check-only" in sys.argv:
        sys.exit(0 if ok else 1)
    if not ok:
        sys.exit("差分があるため書き出しを中止しました")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    js = (
        "/* 自動生成ファイル — 手で編集しないこと\n"
        "   生成元: ignis-manual.html\n"
        "   生成:   python3 tools/convert_manual.py */\n"
        "window.MANUAL_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2)
        + ";\n"
    )
    OUT.write_text(js, encoding="utf-8")
    print(f"書き出し : {OUT.relative_to(ROOT)}  ({len(js.encode('utf-8')):,} bytes)")


if __name__ == "__main__":
    main()
