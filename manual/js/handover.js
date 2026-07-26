/* 引き継ぎ：スプレッドシートに保存 ＋ 最新を表示 ＋ LINE で送る */
(function () {
  "use strict";
  var C = window.IgnisCommon;
  var S = window.IgnisSheets;
  var NAME_KEY = "ignis.handover.name.v1";
  var ACK_KEY = "ignis.handover.ack.v1";
  var WD = ["日", "月", "火", "水", "木", "金", "土"];

  var f = {
    date: document.getElementById("f-date"),
    from: document.getElementById("f-from"),
    to: document.getElementById("f-to"),
    body: document.getElementById("f-body"),
    todo: document.getElementById("f-todo"),
  };
  var statusEl = document.getElementById("status");
  var saveBtn = document.getElementById("save-btn");
  var saveLineBtn = document.getElementById("save-line-btn");

  if (!S.configured()) document.getElementById("not-configured").hidden = false;

  f.date.value = C.todayStr();
  f.from.value = C.Store.get(NAME_KEY, "");
  f.from.addEventListener("input", function () { C.Store.set(NAME_KEY, f.from.value); });

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return (d.getMonth() + 1) + "/" + d.getDate() + "(" + WD[d.getDay()] + ")";
  }

  function status(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = "sheets-status" + (cls ? " " + cls : "");
  }

  function collect() {
    return {
      date: f.date.value,
      from: f.from.value.trim(),
      to: f.to.value.trim(),
      body: f.body.value.trim(),
      todo: f.todo.value.trim(),
    };
  }

  // LINE 用テキストを組み立て
  function lineText(d) {
    var lines = [];
    lines.push("【引き継ぎ】" + fmtDate(d.date));
    var head = "担当：" + (d.from || "-");
    if (d.to) head += " → @" + d.to + " さんへ";
    lines.push(head);
    lines.push("");
    if (d.body) { lines.push("▼申し送り"); lines.push(d.body); lines.push(""); }
    if (d.todo) { lines.push("▼未完了・注意"); lines.push(d.todo); }
    return lines.join("\n").trim();
  }

  function openLine(d) {
    var url = "https://line.me/R/msg/text/?" + encodeURIComponent(lineText(d));
    window.open(url, "_blank");
  }

  function submit(withLine) {
    var d = collect();
    if (!d.from) { status("担当（自分）を入力してください", "error"); return; }
    if (!d.body && !d.todo) { status("申し送りか未完了のどちらかは入力してください", "error"); return; }
    if (!S.configured()) {
      // 連携が無くても LINE 送信だけはできる
      if (withLine) openLine(d);
      status(withLine ? "LINEを開きました（シート保存は未設定）" : "連携が未設定です", withLine ? "" : "error");
      return;
    }

    saveBtn.disabled = saveLineBtn.disabled = true;
    var active = withLine ? saveLineBtn : saveBtn;
    var label = active.textContent;
    active.textContent = "送信中…";
    status("保存中…");

    S.post("handover-add", d)
      .then(function () {
        status("引き継ぎを保存しました", "success");
        if (withLine) openLine(d);
        f.body.value = "";
        f.todo.value = "";
        f.to.value = "";
        loadLatest();
      })
      .catch(function (err) {
        status("保存に失敗：" + err.message + (withLine ? "（LINEは開きます）" : ""), "error");
        if (withLine) openLine(d);
      })
      .finally(function () {
        saveBtn.disabled = saveLineBtn.disabled = false;
        active.textContent = label;
      });
  }

  saveBtn.addEventListener("click", function () { submit(false); });
  saveLineBtn.addEventListener("click", function () { submit(true); });

  // ===== 最新の引き継ぎ表示 =====
  var wrap = document.getElementById("latest-wrap");
  var bodyEl = document.getElementById("latest-body");
  var ackBtn = document.getElementById("ack-btn");
  var lstatus = document.getElementById("latest-status");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderLatest(h) {
    if (!h) {
      wrap.hidden = true;
      lstatus.hidden = false;
      lstatus.textContent = "まだ引き継ぎはありません。";
      return;
    }
    lstatus.hidden = true;
    wrap.hidden = false;
    var meta = fmtDate(h.date) + "　担当：" + esc(h.from) + (h.to ? "　→ " + esc(h.to) : "");
    var html = '<p class="latest-meta">' + meta + "</p>";
    if (h.body) html += '<div class="latest-block"><span class="lb-label">申し送り</span><p>' + esc(h.body).replace(/\n/g, "<br>") + "</p></div>";
    if (h.todo) html += '<div class="latest-block warn"><span class="lb-label">未完了・注意</span><p>' + esc(h.todo).replace(/\n/g, "<br>") + "</p></div>";
    bodyEl.innerHTML = html;

    // 既読
    var key = (h.at || "") + "|" + (h.date || "");
    if (C.Store.get(ACK_KEY, "") === key) {
      ackBtn.hidden = true;
    } else {
      ackBtn.hidden = false;
      ackBtn.textContent = "確認しました";
      ackBtn.onclick = function () {
        C.Store.set(ACK_KEY, key);
        ackBtn.textContent = "確認済み";
        ackBtn.disabled = true;
      };
    }
  }

  function loadLatest() {
    if (!S.configured()) return;
    lstatus.hidden = false;
    lstatus.textContent = "最新の引き継ぎを読み込み中…";
    lstatus.className = "load-status";
    fetch(window.IGNIS_CONFIG.SHEETS_URL + "?action=handover-latest&cb=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (res) { renderLatest(res && res.handover); })
      .catch(function () {
        lstatus.hidden = false;
        lstatus.className = "load-status error";
        lstatus.textContent = "最新の引き継ぎを読み込めませんでした。";
      });
  }

  document.getElementById("refresh-btn").addEventListener("click", loadLatest);
  loadLatest();
})();
