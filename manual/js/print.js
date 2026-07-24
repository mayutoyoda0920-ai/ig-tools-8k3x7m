/* PDF/印刷ページ：全セクション連結 ＋ 目次（ページ番号付き） */
(function () {
  "use strict";
  var data = window.MANUAL_DATA;
  var R = window.ManualRender;
  var content = document.getElementById("content");

  // ---- cover ----
  var today = new Date();
  var dateStr =
    today.getFullYear() + "年" + (today.getMonth() + 1) + "月" + today.getDate() + "日";
  var cover = document.createElement("div");
  cover.className = "cover";
  cover.innerHTML =
    '<div class="mark">IGNIS KAMAKURA</div>' +
    "<h1>業務マニュアル</h1>" +
    '<div class="sub">ignis manual</div>' +
    '<div class="meta">スペシャルティコーヒー / 鎌倉<br>スタッフ用 業務手順書<br>発行日：' +
    dateStr +
    "</div>";
  content.appendChild(cover);

  // ---- body sections (先に作って id を確定させる) ----
  var body = document.createElement("div");
  body.id = "doc-body";
  var tocModel = [];

  data.sections.forEach(function (sec) {
    var secEl = document.createElement("section");
    secEl.className = "doc-section";
    secEl.id = "sec-" + sec.id;
    var h2 = document.createElement("h2");
    h2.textContent = sec.title;
    secEl.appendChild(h2);

    var wrap = document.createElement("div");
    wrap.innerHTML = R.renderSection(sec, { checkboxes: false });
    secEl.appendChild(wrap);

    // subsection に id を付与し、TOC 用モデルを作る
    var subs = [];
    var subEls = wrap.querySelectorAll(".subsection");
    subEls.forEach(function (el, i) {
      var t = el.querySelector(".sub-title");
      var title = t ? t.textContent.trim() : "";
      var id = "sec-" + sec.id + "-sub" + i;
      el.id = id;
      var coming = el.classList.contains("is-coming");
      subs.push({ id: id, title: title, coming: coming });
    });

    tocModel.push({
      id: secEl.id,
      title: sec.title,
      coming: sec.status === "coming-soon",
      subs: subs,
    });
    body.appendChild(secEl);
  });

  // ---- toc ----
  var toc = document.createElement("div");
  toc.className = "toc";
  var ol = ['<h2>目次</h2>', "<ol>"];
  tocModel.forEach(function (s) {
    ol.push(
      '<li class="toc-entry lvl1' + (s.coming ? " coming" : "") + '">' +
        '<a href="#' + s.id + '"><span class="t">' + s.title + "</span>" +
        '<span class="lead"></span></a></li>'
    );
    s.subs.forEach(function (sub) {
      ol.push(
        '<li class="toc-entry lvl2' + (sub.coming ? " coming" : "") + '">' +
          '<a href="#' + sub.id + '"><span class="t">' + sub.title + "</span>" +
          '<span class="lead"></span></a></li>'
      );
    });
  });
  ol.push("</ol>");
  toc.innerHTML = ol.join("");
  content.appendChild(toc);
  content.appendChild(body);

  // ---- Paged.js 実行 ----
  // raw モード（pagedjs-cli 生成時）は自ページで走らせない
  if (window.__RAW) {
    document.body.classList.add("rawmode");
    window.__PAGED_READY = true; // cli 側がページ処理する
    return;
  }

  var s = document.createElement("script");
  s.src = "vendor/paged.polyfill.js";
  s.onload = function () {
    var contentEl = document.getElementById("content");
    contentEl.parentNode.removeChild(contentEl); // ソースを一旦切り離す
    var previewer = new window.Paged.Previewer();
    previewer
      .preview(contentEl, ["css/print.css"], document.body)
      .then(function (flow) {
        window.__PAGED_PAGES = flow && flow.total ? flow.total : 0;
        document.body.classList.add("paged-done");
        window.__PAGED_READY = true;
      })
      .catch(function (err) {
        window.__PAGED_ERROR = String(err && err.stack ? err.stack : err);
      });
  };
  document.body.appendChild(s);
})();
