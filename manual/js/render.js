/* 共有描画ロジック（index.html / print.html で共通利用）
   本文HTMLは data/manual.js（原文そのまま）を挿入するだけ。整形・改変はしない。 */
(function (global) {
  "use strict";

  function el(html) {
    return html;
  }

  // 作業／確認の2カラム行。check が空なら確認側は「—」を薄く表示。
  function twoCol(workHtml, checkHtml, opts) {
    opts = opts || {};
    var head = opts.head || "";
    var checkInner = checkHtml && checkHtml.trim()
      ? checkHtml
      : '<p class="check-none">—</p>';
    return (
      '<div class="row' + (opts.rowClass ? " " + opts.rowClass : "") + '">' +
      (head || "") +
      '<div class="col col-work">' +
      '<div class="col-label">作業</div>' +
      (workHtml || "") +
      "</div>" +
      '<div class="col col-check">' +
      '<div class="col-label">確認</div>' +
      checkInner +
      "</div>" +
      "</div>"
    );
  }

  function renderSteps(block, ctx) {
    return block.items
      .map(function (it, i) {
        var id = ctx.sectionId + ":" + ctx.stepKey + ":" + i;
        var checkbox = ctx.checkboxes
          ? '<label class="chk" aria-label="完了"><input type="checkbox" data-key="' +
            id +
            '"><span class="chk-box"></span></label>'
          : "";
        var work =
          '<div class="step-head"><span class="step-n">' +
          (i + 1) +
          "</span>" +
          (it.title ? '<span class="step-title">' + it.title + "</span>" : "") +
          "</div>" +
          (it.work || "");
        return twoCol(work, it.check, {
          rowClass: "row-step",
          head: checkbox,
        });
      })
      .join("");
  }

  function renderChecklist(block, ctx) {
    var lis = block.items
      .map(function (html, i) {
        var id = ctx.sectionId + ":check:" + i;
        var checkbox = ctx.checkboxes
          ? '<label class="chk" aria-label="完了"><input type="checkbox" data-key="' +
            id +
            '"><span class="chk-box"></span></label>'
          : "";
        return (
          '<li class="cl-item">' + checkbox + "<span>" + html + "</span></li>"
        );
      })
      .join("");
    return '<ul class="checklist">' + lis + "</ul>";
  }

  function renderPillars(block) {
    var cards = block.items
      .map(function (p) {
        return (
          '<div class="pillar-card">' +
          '<div class="pillar-number">' + p.number + "</div>" +
          '<div class="pillar-title">' + p.title + "</div>" +
          '<p class="pillar-desc">' + p.desc + "</p>" +
          "</div>"
        );
      })
      .join("");
    return '<div class="pillars">' + cards + "</div>";
  }

  function renderBlocks(blocks, ctx) {
    return blocks
      .map(function (b, bi) {
        switch (b.type) {
          case "steps":
            return renderSteps(b, Object.assign({}, ctx, { stepKey: "s" + bi }));
          case "checklist":
            return renderChecklist(b, ctx);
          case "pillars":
            return renderPillars(b);
          case "table":
            return '<div class="table-wrap">' + b.html + "</div>";
          case "subsection":
            var comingSoon =
              b.blocks.length === 1 &&
              b.blocks[0].type === "free" &&
              /coming-soon/.test(b.blocks[0].work || "");
            return (
              '<div class="subsection' + (comingSoon ? " is-coming" : "") +
              '" id="sub-' + ctx.sectionId + "-" + bi + '">' +
              '<h3 class="sub-title">' + b.title + "</h3>" +
              renderBlocks(b.blocks, Object.assign({}, ctx, { stepKey: "sub" + bi })) +
              "</div>"
            );
          case "free":
            // 作業のみ・確認のみでも2カラム枠で出す（そろえるため）
            if (/coming-soon/.test(b.work || "")) {
              return b.work; // 準備中はそのまま
            }
            return twoCol(b.work, b.check, { rowClass: "row-free" });
          default:
            return "";
        }
      })
      .join("");
  }

  function renderSection(section, opts) {
    opts = opts || {};
    var ctx = {
      sectionId: section.id,
      checkboxes: !!opts.checkboxes,
      stepKey: "s",
    };
    if (section.status === "coming-soon") {
      return (
        '<div class="coming-block">' +
        '<span class="coming-badge">準備中</span>' +
        '<p class="coming-note">この項目は準備中です。追って追加されます。</p>' +
        "</div>"
      );
    }
    var goal = section.goal
      ? '<div class="note goal">' + section.goal + "</div>"
      : "";

    // 章内の小目次（サブ見出しへジャンプ）。アプリのみ・2つ以上あるとき。
    var subtoc = "";
    if (opts.subtoc) {
      var chips = section.blocks
        .map(function (b, bi) {
          if (b.type !== "subsection") return "";
          return '<a class="subtoc-link" data-target="sub-' + section.id + "-" + bi + '">' + b.title + "</a>";
        })
        .filter(Boolean);
      if (chips.length >= 2) {
        subtoc =
          '<nav class="subtoc"><span class="subtoc-label">この章の目次</span>' +
          chips.join("") + "</nav>";
      }
    }

    return subtoc + goal + renderBlocks(section.blocks, ctx);
  }

  global.ManualRender = {
    renderSection: renderSection,
    renderBlocks: renderBlocks,
  };
})(window);
