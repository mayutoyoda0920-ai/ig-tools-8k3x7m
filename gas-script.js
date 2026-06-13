// ============================================
// Google Apps Script - スプレッドシート連携
// ============================================
//
// 【設定手順】
// 1. Google スプレッドシートを新規作成
// 2. 1行目に見出しを入力: 日付 | 店名 | 勘定科目 | 金額 | メモ
// 3. メニュー「拡張機能」→「Apps Script」を開く
// 4. このファイルの内容をすべてコピーして貼り付け
// 5. 「デプロイ」→「新しいデプロイ」
//    - 種類: 「ウェブアプリ」
//    - 実行するユーザー: 「自分」
//    - アクセス: 「全員」
// 6. デプロイして表示されるURLをコピー
// 7. receipt.html の GAS_URL = '' にそのURLを貼る
//
// 以上で完了！
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    const expenses = data.expenses || [];

    expenses.forEach(function(exp) {
      sheet.appendRow([
        exp.date,
        exp.store || '',
        exp.category,
        exp.amount,
        exp.memo || '',
        new Date() // 送信日時
      ]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', count: expenses.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GETリクエストでテスト用
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Receipt API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
