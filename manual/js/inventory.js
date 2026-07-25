/* 物品在庫の入力：品目ごとの在庫数 → GAS 経由でスプレッドシートに追記 */
(function () {
  "use strict";
  var C = window.IgnisCommon;
  var S = window.IgnisSheets;
  var ITEMS_KEY = "ignis.inventory.items.v1";
  var NAME_KEY = "ignis.inventory.name.v1";

  var DEFAULT_ITEMS = [
    "ホットカップ", "アイスカップ", "テイクアウトカップ蓋", "ストロー",
    "ドリップバッグ", "牛乳", "豆（エスプレッソ）", "豆（ドリップ）", "ナプキン",
  ];

  var rowsEl = document.getElementById("inv-rows");
  var statusEl = document.getElementById("status");
  var submitBtn = document.getElementById("submit-btn");
  var dateEl = document.getElementById("f-date");
  var nameEl = document.getElementById("f-name");

  if (!S.configured()) document.getElementById("not-configured").hidden = false;

  dateEl.value = C.todayStr();
  nameEl.value = C.Store.get(NAME_KEY, "");
  nameEl.addEventListener("input", function () { C.Store.set(NAME_KEY, nameEl.value); });

  var items = C.Store.get(ITEMS_KEY, null);
  if (!items || !items.length) items = DEFAULT_ITEMS.slice();

  function saveItems() {
    var names = [].map.call(rowsEl.querySelectorAll(".inv-name"), function (i) {
      return i.value.trim();
    }).filter(Boolean);
    C.Store.set(ITEMS_KEY, names);
  }

  function makeRow(name) {
    var row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML =
      '<input class="cell-input inv-name" type="text" placeholder="品目名" value="' +
      (name || "").replace(/"/g, "&quot;") + '">' +
      '<input class="cell-input inv-count" type="number" min="0" step="1" inputmode="numeric" placeholder="0">' +
      '<input class="cell-input inv-unit" type="text" placeholder="個 等">' +
      '<input class="cell-input inv-days" type="text" inputmode="numeric" placeholder="日">' +
      '<input class="cell-input inv-reorder" type="text" placeholder="○月○日頃">' +
      '<button type="button" class="row-del" aria-label="削除">×</button>';
    row.querySelector(".row-del").addEventListener("click", function () {
      row.remove();
      saveItems();
    });
    row.querySelector(".inv-name").addEventListener("input", saveItems);
    return row;
  }

  items.forEach(function (n) { rowsEl.appendChild(makeRow(n)); });

  document.getElementById("add-item").addEventListener("click", function () {
    var row = makeRow("");
    rowsEl.appendChild(row);
    row.querySelector(".inv-name").focus();
  });

  function status(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = "sheets-status" + (cls ? " " + cls : "");
  }

  function collect() {
    var out = [];
    [].forEach.call(rowsEl.querySelectorAll(".inv-row"), function (row) {
      var name = row.querySelector(".inv-name").value.trim();
      var count = row.querySelector(".inv-count").value;
      if (!name || count === "") return; // 数量が空の品目は送らない
      out.push({
        name: name,
        count: Number(count),
        unit: row.querySelector(".inv-unit").value.trim(),
        daysLeft: row.querySelector(".inv-days").value.trim(),
        reorder: row.querySelector(".inv-reorder").value.trim(),
      });
    });
    return out;
  }

  submitBtn.addEventListener("click", function () {
    if (!S.configured()) { status("連携が未設定です", "error"); return; }
    var list = collect();
    if (!list.length) { status("在庫数が入力された品目がありません", "error"); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "送信中…";
    status("送信中…");

    S.post("inventory-add", {
      date: dateEl.value || C.todayStr(),
      who: nameEl.value.trim(),
      items: list,
    })
      .then(function (r) {
        status((r.count || list.length) + " 品目を記録しました", "success");
        // 数量系だけクリア（品目名は残す）
        [].forEach.call(rowsEl.querySelectorAll(".inv-row"), function (row) {
          ["inv-count", "inv-unit", "inv-days", "inv-reorder"].forEach(function (c) {
            row.querySelector("." + c).value = "";
          });
        });
      })
      .catch(function (err) { status("失敗：" + err.message, "error"); })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "スプレッドシートに記録";
      });
  });
})();
