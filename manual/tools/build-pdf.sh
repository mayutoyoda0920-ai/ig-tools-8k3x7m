#!/usr/bin/env bash
# ignis 業務マニュアル PDF を再生成する。
#   1) data/manual.js を既存 HTML から再変換（原文一致を検証）
#   2) ローカルサーバを立てて print.html を実 Chrome で開き、
#      Paged.js のページ組み完了後に dist/ignis-manual.pdf を出力
#
# usage: bash tools/build-pdf.sh
set -euo pipefail
cd "$(dirname "$0")/.."          # manual/ 直下へ
PORT="${PORT:-4700}"
ROOT_SERVE="$(cd .. && pwd)"     # リポジトリ root（/manual/ の親）を配信

echo "== 0) PDF 生成ツールの確認 =="
if [ ! -d tools/node_modules/puppeteer-core ]; then
  echo "puppeteer-core を導入します..."
  ( cd tools && npm i puppeteer-core@23 >/dev/null 2>&1 )
fi

echo "== 1) 本文データを再生成・検証 =="
python3 tools/convert_manual.py

echo "== 2) ローカルサーバ起動 (port $PORT) =="
python3 -m http.server "$PORT" --directory "$ROOT_SERVE" >/tmp/ignis-pdf-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 1

echo "== 3) Chrome で PDF 生成 =="
node tools/gen-pdf.mjs "http://localhost:$PORT/manual/print.html" "$PWD/dist/ignis-manual.pdf"

echo "== 完了: dist/ignis-manual.pdf =="
