// ============================================
// Google Apps Script - スプレッドシート連携 v2
// ============================================
//
// 【更新手順】
// 1. Apps Script エディタでこの内容に差し替え
// 2. 「デプロイ」→「デプロイを管理」→ 鉛筆アイコン
// 3. バージョンを「新しいバージョン」に変更
// 4. 「デプロイ」を押す（URLは変わりません）
// ============================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var action = data.action || 'add';

    // 追加
    if (action === 'add') {
      var expenses = data.expenses || [];
      expenses.forEach(function(exp) {
        sheet.appendRow([
          exp.date,
          exp.store || '',
          exp.category,
          exp.amount,
          exp.memo || '',
          new Date()
        ]);
      });
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', action: 'add', count: expenses.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 削除（行番号指定）
    if (action === 'delete') {
      var rowIndex = data.rowIndex;
      if (rowIndex && rowIndex >= 2) {
        sheet.deleteRow(rowIndex);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', action: 'delete' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// データ取得
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', expenses: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var expenses = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var dateVal = row[0];
      var dateStr = '';
      if (dateVal instanceof Date) {
        dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        dateStr = String(dateVal);
      }

      expenses.push({
        rowIndex: i + 1,
        date: dateStr,
        store: row[1] || '',
        category: row[2] || '',
        amount: Number(row[3]) || 0,
        memo: row[4] || ''
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', expenses: expenses }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
