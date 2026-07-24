/* インストール済み Google Chrome を puppeteer-core で制御し、
   Paged.js のページ生成完了(__PAGED_READY)を待ってから PDF 化する。
   usage: node tools/gen-pdf.mjs [url] [outPath] */
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const URL = process.argv[2] || "http://localhost:4700/manual/print.html";
const OUT = resolve(process.argv[3] || resolve(ROOT, "dist/ignis-manual.pdf"));

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];
const chrome = CHROME_CANDIDATES.find(existsSync);
if (!chrome) {
  console.error("Chrome/Chromium が見つかりません");
  process.exit(1);
}

await mkdir(dirname(OUT), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  console.log("open:", URL);
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });

  // Paged.js のページ組み完了を待つ
  await page.waitForFunction("window.__PAGED_READY === true", { timeout: 90000 });
  const pages = await page.evaluate(
    () => document.querySelectorAll(".pagedjs_page").length
  );
  console.log("paged pages:", pages);

  await page.pdf({
    path: OUT,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log("written:", OUT);
} finally {
  await browser.close();
}
