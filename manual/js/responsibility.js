/* 責任マップ：CSV読込 → 編集（localStorage）→ フィルタ → CSVエクスポート */
(function () {
  "use strict";
  var C = window.IgnisCommon;
  var KEY = "ignis.respmap.v1";
  var CSV_URL = "data/responsibility-map.csv";

  var COLS = ["カテゴリ", "機能", "今の担当", "2027年1月〜", "権限レベル", "困ったときの連絡先", "備考"];
  var EDITABLE = { "今の担当": "now", "2027年1月〜": "from2027", "権限レベル": "level", "困ったときの連絡先": "contact" };
  var LEVELS = ["A", "B", "C"];

  var rows = [];
  var edits = C.Store.get(KEY, {});
  var onlyEmpty = false;

  var tbody = document.getElementById("map-body");
  var emptyToggle = document.getElementById("only-empty");
  var emptyCount = document.getElementById("empty-count");
  var statusEl = document.getElementById("load-status");

  // --- CSV パーサ（クォート対応） ---
  function parseCSV(text) {
    var out = [], row = [], field = "", i = 0, q = false, c;
    text = text.replace(/\r\n?/g, "\n");
    while (i < text.length) {
      c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else q = false;
        } else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; }
      else field += c;
      i++;
    }
    if (field.length || row.length) { row.push(field); out.push(row); }
    return out;
  }

  function rowKey(r) { return r["カテゴリ"] + "|" + r["機能"]; }

  function effective(r, prop) {
    var e = edits[rowKey(r)];
    if (e && e[prop] != null && e[prop] !== "") return e[prop];
    if (e && e[prop] === "") return ""; // 明示的に空へ編集
    return r["__" + prop]; // CSV 初期値
  }

  function setEdit(r, prop, val) {
    var k = rowKey(r);
    edits[k] = edits[k] || {};
    edits[k][prop] = val;
    C.Store.set(KEY, edits);
  }

  function isEmptyOwner(r) {
    return !effective(r, "now") || effective(r, "now").trim() === "";
  }

  function render() {
    tbody.innerHTML = "";
    var nEmpty = 0;
    var lastCat = null;
    rows.forEach(function (r) {
      if (isEmptyOwner(r)) nEmpty++;
      if (onlyEmpty && !isEmptyOwner(r)) return;

      var tr = document.createElement("tr");
      if (isEmptyOwner(r)) tr.className = "empty-owner";

      // カテゴリ（変わったときだけ表示）
      var tdCat = document.createElement("td");
      tdCat.className = "cat";
      if (r["カテゴリ"] !== lastCat) { tdCat.textContent = r["カテゴリ"]; lastCat = r["カテゴリ"]; }
      tr.appendChild(tdCat);

      // 機能
      var tdFn = document.createElement("td");
      tdFn.className = "fn";
      tdFn.textContent = r["機能"];
      tr.appendChild(tdFn);

      // 今の担当（編集）
      tr.appendChild(inputCell(r, "now", "担当者名"));
      // 2027年1月〜（編集）
      tr.appendChild(inputCell(r, "from2027", "担当者名"));
      // 権限レベル（select）
      tr.appendChild(levelCell(r));
      // 連絡先（編集）
      tr.appendChild(inputCell(r, "contact", "連絡先"));
      // 備考（読み取り）
      var tdNote = document.createElement("td");
      tdNote.className = "note-cell";
      tdNote.textContent = r["備考"] || "";
      tr.appendChild(tdNote);

      tbody.appendChild(tr);
    });

    emptyCount.textContent = nEmpty;
    if (onlyEmpty && tbody.children.length === 0) {
      var tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="7" class="none-msg">空欄の行はありません。</td>';
      tbody.appendChild(tr);
    }
  }

  function inputCell(r, prop, ph) {
    var td = document.createElement("td");
    var inp = document.createElement("input");
    inp.type = "text";
    inp.value = effective(r, prop) || "";
    inp.placeholder = ph;
    inp.className = "cell-input";
    inp.addEventListener("input", function () {
      setEdit(r, prop, inp.value);
      if (prop === "now") {
        var tr = td.parentNode;
        var empty = !inp.value.trim();
        tr.classList.toggle("empty-owner", empty);
        // 件数更新
        var n = rows.filter(isEmptyOwner).length;
        emptyCount.textContent = n;
      }
    });
    td.appendChild(inp);
    return td;
  }

  function levelCell(r) {
    var td = document.createElement("td");
    var sel = document.createElement("select");
    sel.className = "cell-select lv-" + (effective(r, "level") || "");
    LEVELS.forEach(function (lv) {
      var o = document.createElement("option");
      o.value = lv; o.textContent = lv;
      if (effective(r, "level") === lv) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      setEdit(r, "level", sel.value);
      sel.className = "cell-select lv-" + sel.value;
    });
    td.appendChild(sel);
    return td;
  }

  function exportCSV() {
    var esc = function (v) {
      v = v == null ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var lines = [COLS.join(",")];
    rows.forEach(function (r) {
      lines.push([
        r["カテゴリ"], r["機能"],
        effective(r, "now") || "", effective(r, "from2027") || "",
        effective(r, "level") || "", effective(r, "contact") || "",
        r["備考"] || "",
      ].map(esc).join(","));
    });
    var blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "responsibility-map-" + C.todayStr() + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // --- init ---
  fetch(CSV_URL, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (text) {
      var table = parseCSV(text).filter(function (r) {
        return r.length > 1 || (r[0] && r[0].trim());
      });
      var header = table.shift();
      rows = table
        .filter(function (r) { return r[0] && r[0].trim(); })
        .map(function (r) {
          var o = {};
          header.forEach(function (h, i) { o[h.trim()] = (r[i] || "").trim(); });
          // CSV 初期値を __prop に退避
          o.__now = o["今の担当"]; o.__from2027 = o["2027年1月〜"];
          o.__level = o["権限レベル"]; o.__contact = o["困ったときの連絡先"];
          return o;
        });
      statusEl.hidden = true;
      render();
    })
    .catch(function (e) {
      statusEl.textContent = "CSVの読み込みに失敗しました（" + e.message + "）。ローカルで開く場合はサーバ経由で表示してください。";
      statusEl.className = "load-status error";
    });

  emptyToggle.addEventListener("change", function () {
    onlyEmpty = emptyToggle.checked;
    render();
  });
  document.getElementById("export-btn").addEventListener("click", exportCSV);

  // 「編集をリセット」は誤操作防止のため通常は非表示。
  // 店長用：URL に ?admin を付けたときだけ表示される。
  var resetBtn = document.getElementById("reset-btn");
  if ((location.search + location.hash).indexOf("admin") >= 0) resetBtn.hidden = false;
  resetBtn.addEventListener("click", function () {
    if (!confirm("編集内容をすべて消去して、CSVの初期状態に戻します。よろしいですか？")) return;
    edits = {};
    C.Store.set(KEY, edits);
    render();
  });
})();
