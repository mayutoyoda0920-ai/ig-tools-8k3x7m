/* スプレッドシート連携の設定
   ここに Google Apps Script（ウェブアプリ）の /exec URL と合言葉を入れると、
   売上記録・物品在庫の入力がスプレッドシートに追記されるようになる。
   未設定（空）の場合は、入力画面に「未設定」の案内が出る。
   ※ このファイルは公開リポジトリに含まれるため、URL・合言葉は第三者にも見えうる。
     詳しくは tools/gas-sheets.gs の注意書きを参照。 */
window.IGNIS_CONFIG = {
  SHEETS_URL: "",   // 例: https://script.google.com/macros/s/XXXX/exec
  TOKEN: "ignis-42d5042d"         // GAS 側の TOKEN と同じ文字列にする（簡易保護）
};
