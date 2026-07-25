/* GAS ウェブアプリへの送信ヘルパー（receipt ツールと同じ CORS 回避方式） */
(function (global) {
  "use strict";
  var cfg = global.IGNIS_CONFIG || {};

  function configured() {
    return !!(cfg.SHEETS_URL && cfg.SHEETS_URL.indexOf("http") === 0);
  }

  // action と payload を送る。成功時 {status:'ok', ...} を返す。
  function post(action, payload) {
    if (!configured()) {
      return Promise.reject(new Error("スプレッドシート連携が未設定です"));
    }
    var body = Object.assign({ action: action, token: cfg.TOKEN || "" }, payload);
    return fetch(cfg.SHEETS_URL, {
      method: "POST",
      // ヘッダを付けない＝text/plain 扱いでプリフライトを避ける（GAS 用の定石）
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (result) {
        if (!result || result.status !== "ok") {
          throw new Error((result && result.message) || "送信に失敗しました");
        }
        return result;
      });
  }

  global.IgnisSheets = { configured: configured, post: post };
})(window);
