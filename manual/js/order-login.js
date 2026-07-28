/* 発注ログイン情報：合言葉をGASに送り、照合が通れば非公開シートの内容を表示 */
(function () {
  "use strict";
  var S = window.IgnisSheets;

  var form = document.getElementById("pw-form");
  var pwEl = document.getElementById("f-pw");
  var statusEl = document.getElementById("status");
  var showBtn = document.getElementById("show-btn");
  var wrap = document.getElementById("creds-wrap");
  var table = document.getElementById("creds-table");

  if (!S.configured()) document.getElementById("not-configured").hidden = false;

  function status(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = "sheets-status" + (cls ? " " + cls : "");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render(headers, rows) {
    var html = "<thead><tr>";
    headers.forEach(function (h) { html += "<th>" + esc(h) + "</th>"; });
    html += "</tr></thead><tbody>";
    if (!rows.length) {
      html += '<tr><td colspan="' + Math.max(headers.length, 1) + '">データがありません</td></tr>';
    } else {
      rows.forEach(function (r) {
        html += "<tr>";
        r.forEach(function (c) { html += "<td>" + esc(c) + "</td>"; });
        html += "</tr>";
      });
    }
    html += "</tbody>";
    table.innerHTML = html;
  }

  function hide() {
    wrap.hidden = true;
    table.innerHTML = "";
    pwEl.value = "";
    form.hidden = false;
  }

  document.getElementById("hide-btn").addEventListener("click", hide);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!S.configured()) { status("連携が未設定です", "error"); return; }
    if (!pwEl.value) { status("合言葉を入力してください", "error"); return; }

    showBtn.disabled = true;
    showBtn.textContent = "確認中…";
    status("確認中…");

    S.post("order-creds", { pw: pwEl.value })
      .then(function (res) {
        render(res.headers || [], res.rows || []);
        wrap.hidden = false;
        form.hidden = true;
        status("");
      })
      .catch(function (err) {
        status(err.message || "表示できませんでした", "error");
      })
      .finally(function () {
        showBtn.disabled = false;
        showBtn.textContent = "表示する";
      });
  });
})();
