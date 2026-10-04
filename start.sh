#!/usr/bin/env bash
# 从脚本所在目录启动前端，避免用户调整工作目录后路径失效。
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo '请安装 Node 22.14.0'; exit 1; }
command -v pnpm >/dev/null || { echo '请安装 pnpm 9.4.0'; exit 1; }
if [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile
fi
exec pnpm dev
