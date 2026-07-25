/* 売上記録：入力 → GAS 経由でスプレッドシートに追記 */
(function () {
  "use strict";
  var C = window.IgnisCommon;
  var S = window.IgnisSheets;
  var DRAFT = "ignis.sales.draft.v1";
  var WD = ["日", "月", "火", "水", "木", "金", "土"];

  var f = {
    date: document.getElementById("f-date"),
    weekday: document.getElementById("f-weekday"),
    weather: document.getElementById("f-weather"),
    total: document.getElementById("f-total"),
    cash: document.getElementById("f-cash"),
    credit: document.getElementById("f-credit"),
    petty: document.getElementById("f-petty"),
    pettybal: document.getElementById("f-pettybal"),
    bag: document.getElementById("f-bag"),
    name: document.getElementById("f-name"),
    memo: document.getElementById("f-memo"),
  };
  var form = document.getElementById("sales-form");
  var statusEl = document.getElementById("status");
  var submitBtn = document.getElementById("submit-btn");

  if (!S.configured()) {
    document.getElementById("not-configured").hidden = false;
  }

  function setWeekday() {
    if (!f.date.value) { f.weekday.value = ""; return; }
    var d = new Date(f.date.value + "T00:00:00");
    f.weekday.value = isNaN(d) ? "" : WD[d.getDay()];
  }

  // 復元
  var draft = C.Store.get(DRAFT, null);
  if (draft) {
    Object.keys(f).forEach(function (k) {
      if (draft[k] != null) f[k].value = draft[k];
    });
  }
  if (!f.date.value) f.date.value = C.todayStr();
  setWeekday();

  f.date.addEventListener("change", setWeekday);

  function collect() {
    return {
      date: f.date.value,
      weekday: f.weekday.value,
      weather: f.weather.value.trim(),
      total: f.total.value === "" ? "" : Number(f.total.value),
      cash: f.cash.value === "" ? "" : Number(f.cash.value),
      credit: f.credit.value === "" ? "" : Number(f.credit.value),
      pettySettle: f.petty.value === "" ? "" : Number(f.petty.value),
      pettyBalance: f.pettybal.value === "" ? "" : Number(f.pettybal.value),
      bagCash: f.bag.value === "" ? "" : Number(f.bag.value),
      name: f.name.value.trim(),
      memo: f.memo.value.trim(),
    };
  }

  // 入力のたびに下書き保存
  form.addEventListener("input", function () {
    var d = {};
    Object.keys(f).forEach(function (k) { d[k] = f[k].value; });
    C.Store.set(DRAFT, d);
  });

  function status(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = "sheets-status" + (cls ? " " + cls : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!f.date.value) { status("日付を入力してください", "error"); return; }
    if (!S.configured()) { status("連携が未設定です", "error"); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "送信中…";
    status("送信中…");

    S.post("sales-add", { row: collect() })
      .then(function () {
        status(f.date.value + " の売上を記録しました", "success");
        // 金額だけクリア（日付・氏名は残す）
        ["total", "cash", "credit", "petty", "pettybal", "bag", "memo", "weather"].forEach(
          function (k) { f[k].value = ""; }
        );
        C.Store.set(DRAFT, {});
      })
      .catch(function (err) {
        status("失敗：" + err.message, "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "スプレッドシートに記録";
      });
  });
})();
