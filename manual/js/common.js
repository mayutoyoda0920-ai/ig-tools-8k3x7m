/* 共通ユーティリティ：localStorage・日付・ヘッダー */
(function (global) {
  "use strict";

  function todayStr() {
    var d = new Date();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  }

  var Store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {}
    },
  };

  // 進捗：日付が変わっていたらリセット
  var PROGRESS_KEY = "ignis.manual.progress.v1";
  function loadProgress() {
    var p = Store.get(PROGRESS_KEY, null);
    var today = todayStr();
    if (!p || p.date !== today) {
      p = { date: today, checked: {} };
      Store.set(PROGRESS_KEY, p);
    }
    return p;
  }
  function saveProgress(p) {
    p.date = todayStr();
    Store.set(PROGRESS_KEY, p);
  }

  global.IgnisCommon = {
    todayStr: todayStr,
    Store: Store,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
  };
})(window);
