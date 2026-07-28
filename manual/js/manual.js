/* マニュアル画面：タブ切替・描画・進捗チェック */
(function () {
  "use strict";
  var data = window.MANUAL_DATA;
  var C = window.IgnisCommon;
  var R = window.ManualRender;

  var progress = C.loadProgress();

  var tabsEl = document.getElementById("tabs");
  var menuEl = document.getElementById("menu-list");
  var bodyEl = document.getElementById("section-body");
  var titleEl = document.getElementById("section-title");
  var progWrap = document.getElementById("progress-wrap");
  var progBar = document.getElementById("progress-bar");
  var progText = document.getElementById("progress-text");

  function sectionById(id) {
    return data.sections.filter(function (s) {
      return s.id === id;
    })[0];
  }

  // タブ & メニュー生成
  data.sections.forEach(function (s) {
    var coming = s.status === "coming-soon";
    var t = document.createElement(coming ? "span" : "a");
    t.className = "tab" + (coming ? " is-coming" : "");
    t.textContent = s.title + (coming ? "（準備中）" : "");
    if (!coming) {
      t.href = "#" + s.id;
    } else {
      t.setAttribute("aria-disabled", "true");
    }
    t.dataset.id = s.id;
    tabsEl.appendChild(t);

    var li = document.createElement("li");
    var m = document.createElement(coming ? "span" : "a");
    m.className = "menu-item" + (coming ? " is-coming" : "");
    m.textContent = s.title + (coming ? "（準備中）" : "");
    if (!coming) m.href = "#" + s.id;
    m.dataset.id = s.id;
    li.appendChild(m);
    menuEl.appendChild(li);
  });

  function countCheckboxes(sec) {
    var n = 0;
    (function walk(blocks) {
      blocks.forEach(function (b) {
        if (b.type === "steps") n += b.items.length;
        else if (b.type === "checklist") n += b.items.length;
        else if (b.type === "subsection") walk(b.blocks);
      });
    })(sec.blocks || []);
    return n;
  }

  function updateProgress(sec) {
    var total = countCheckboxes(sec);
    if (!total) {
      progWrap.hidden = true;
      return;
    }
    var boxes = bodyEl.querySelectorAll('input[type="checkbox"]');
    var done = 0;
    boxes.forEach(function (b) {
      if (b.checked) done++;
    });
    progWrap.hidden = false;
    var pct = total ? Math.round((done / total) * 100) : 0;
    progBar.style.width = pct + "%";
    progText.textContent = done + " / " + total + " 完了";
  }

  function render(id, push) {
    var sec = sectionById(id) || data.sections[0];
    if (sec.status === "coming-soon") return;

    titleEl.textContent = sec.title;
    bodyEl.innerHTML = R.renderSection(sec, { checkboxes: true, subtoc: true });

    // 小目次のチップ → 対象のサブ見出しへスクロール
    bodyEl.querySelectorAll(".subtoc-link").forEach(function (a) {
      a.addEventListener("click", function () {
        var t = document.getElementById(a.getAttribute("data-target"));
        if (t) t.scrollIntoView({ block: "start" });
      });
    });

    // チェック状態復元
    var boxes = bodyEl.querySelectorAll('input[type="checkbox"]');
    boxes.forEach(function (b) {
      var key = b.getAttribute("data-key");
      if (progress.checked[key]) {
        b.checked = true;
        var row = b.closest(".row") || b.closest(".cl-item");
        if (row) row.classList.add("is-done");
      }
      b.addEventListener("change", function () {
        if (b.checked) progress.checked[key] = true;
        else delete progress.checked[key];
        C.saveProgress(progress);
        var row = b.closest(".row") || b.closest(".cl-item");
        if (row) row.classList.toggle("is-done", b.checked);
        updateProgress(sec);
      });
    });

    updateProgress(sec);

    // アクティブ表示
    [tabsEl, menuEl].forEach(function (container) {
      container.querySelectorAll("[data-id]").forEach(function (n) {
        n.classList.toggle("is-active", n.dataset.id === sec.id);
      });
    });

    // アクティブタブを見える位置へ
    var at = tabsEl.querySelector(".tab.is-active");
    if (at && at.scrollIntoView)
      at.scrollIntoView({ inline: "center", block: "nearest" });

    bodyEl.parentNode.scrollTop = 0;
    window.scrollTo(0, 0);
    closeMenu();
    if (push && location.hash !== "#" + sec.id) {
      history.replaceState(null, "", "#" + sec.id);
    }
  }

  function currentId() {
    var h = (location.hash || "").replace("#", "");
    var sec = sectionById(h);
    if (sec && sec.status !== "coming-soon") return h;
    // 最初の ready セクション
    var first = data.sections.filter(function (s) {
      return s.status !== "coming-soon";
    })[0];
    return first ? first.id : data.sections[0].id;
  }

  window.addEventListener("hashchange", function () {
    render(currentId(), false);
  });

  // ハンバーガー
  var menu = document.getElementById("menu");
  var menuBtn = document.getElementById("menu-btn");
  var backdrop = document.getElementById("backdrop");
  function openMenu() {
    menu.classList.add("open");
    backdrop.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    menu.classList.remove("open");
    backdrop.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }
  menuBtn.addEventListener("click", function () {
    menu.classList.contains("open") ? closeMenu() : openMenu();
  });
  backdrop.addEventListener("click", closeMenu);

  render(currentId(), true);
})();
