/* ============================================================
   ignis 業務アプリ — スプレッドシート連携用 Google Apps Script
   （売上記録 / 物品在庫の追記）
   ------------------------------------------------------------
   ■ 導入手順
   1. 連携したいスプレッドシート（＝いまの売上表）を開く
   2. 拡張機能 → Apps Script を開く
   3. このファイルの中身を丸ごと貼り付ける
   4. 下の CONFIG を自分の環境に合わせて直す
      - TOKEN: 好きな合言葉（manual/js/config.js の TOKEN と同じにする）
      - SALES_SHEET_NAME: 売上を書き込むシート（タブ）の名前
      - INVENTORY_SHEET_NAME: 物品在庫を書き込むシート名（無ければ自動作成）
   5. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
      - 実行するユーザー: 自分
      - アクセスできるユーザー: 全員
   6. 発行された URL（.../exec）を manual/js/config.js の SHEETS_URL に貼る
   ※ 更新時は「デプロイを管理」→ 鉛筆 →「新しいバージョン」→ デプロイ（URLは不変）

   ■ 注意（重要）
   このアプリは公開サイト（GitHub Pages）です。config.js の URL・合言葉は
   ソースを見れば第三者にも分かります。合言葉は「いたずら防止」程度の保護です。
   本当に非公開にしたい場合は、サイトを非公開ホストに移すか相談してください。
   ============================================================ */

var CONFIG = {
  TOKEN: "ignis-42d5042d",                 // ← config.js と一致させる
  SHEET_ID: "1gfzZpDkd5CfgwrIDUXesm6SMhJQJdre3A-tpGZP8VNs",  // 売上スプレッドシートのID
  SALES_SHEET_GID: 1745551474,             // 書き込む売上タブ（URLの gid= の数字）
  SALES_SHEET_NAME: "売上記録",            // gid が見つからない時の予備（タブ名）
  INVENTORY_SHEET_NAME: "物品管理",        // 無ければ自動で作成される
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (CONFIG.TOKEN && data.token !== CONFIG.TOKEN) {
      return json({ status: "error", message: "合言葉が違います" });
    }

    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

    if (data.action === "sales-add") {
      var r = data.row || {};
      var sh = sheetByGid(ss, CONFIG.SALES_SHEET_GID)
            || ss.getSheetByName(CONFIG.SALES_SHEET_NAME) || ss.getActiveSheet();
      sh.appendRow([
        r.date || "",
        r.weekday || "",
        r.weather || "",
        num(r.total), num(r.cash), num(r.credit),
        num(r.pettySettle), num(r.pettyBalance), num(r.bagCash),
        r.name || "",
        r.memo || "",
      ]);
      return json({ status: "ok", action: "sales-add" });
    }

    if (data.action === "inventory-add") {
      var sh2 = getOrCreate(ss, CONFIG.INVENTORY_SHEET_NAME, [
        "日付", "品目", "在庫数", "単位", "残り日数", "発注見立て", "記入者", "記録日時",
      ]);
      var items = data.items || [];
      var now = new Date();
      items.forEach(function (it) {
        sh2.appendRow([
          data.date || "",
          it.name || "",
          num(it.count),
          it.unit || "",
          it.daysLeft || "",
          it.reorder || "",
          data.who || "",
          now,
        ]);
      });
      return json({ status: "ok", action: "inventory-add", count: items.length });
    }

    return json({ status: "error", message: "Unknown action" });
  } catch (err) {
    return json({ status: "error", message: String(err) });
  }
}

function doGet() {
  return json({ status: "ok", message: "ignis sheets endpoint is alive" });
}

function num(v) {
  if (v === "" || v == null) return "";
  var n = Number(v);
  return isNaN(n) ? v : n;
}

function sheetByGid(ss, gid) {
  if (gid == null) return null;
  var shs = ss.getSheets();
  for (var i = 0; i < shs.length; i++) {
    if (shs[i].getSheetId() === gid) return shs[i];
  }
  return null;
}

function getOrCreate(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
