#!/bin/bash
#
# 把代码 push 到 GitHub，由 Cloudflare Pages 自动构建上线。
#
# 触发方式：
#   - `npm run generate`       → 本地生成成功后，postgenerate 钩子自动调用本脚本
#   - `npm run deploy`         → 不重新构建，直接提交并推送
#   - `npm run deploy -- "提交信息"`  → 自定义提交信息
#   - `bash scripts/deploy.sh`
#
# 流程：git add -A → git commit（有改动才提交）→ git push 当前分支
#
# 跳过推送（只在本地生成、不上线）：
#   - `npx nuxt generate`         （直接调底层命令，不触发 npm 的 postgenerate 钩子）
#   - 或 `SKIP_DEPLOY=1 npm run generate`
set -euo pipefail

# 切到项目根目录（脚本可能从任意目录被调用）
cd "$(dirname "$0")/.."

# 手动跳过
if [ "${SKIP_DEPLOY:-0}" = "1" ]; then
  echo "⏭  SKIP_DEPLOY=1，跳过推送。"
  exit 0
fi

# 在 CI（含 Cloudflare Pages 构建环境）里不要再次 push，避免构建时自我推送/死循环
if [ -n "${CF_PAGES:-}" ] || [ -n "${CI:-}" ]; then
  echo "⏭  检测到 CI/Cloudflare 构建环境，跳过推送。"
  exit 0
fi

# 远程：默认 github，不存在则退回第一个远程
REMOTE="${DEPLOY_GIT_REMOTE:-github}"
if ! git remote get-url "$REMOTE" &>/dev/null; then
  REMOTE="$(git remote | head -1)"
fi
if [ -z "$REMOTE" ]; then
  echo "❌ 没有配置 git 远程仓库。" >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# 提交信息：优先用传入参数，否则用时间戳
MSG="${1:-chore: deploy $(date '+%Y-%m-%d %H:%M')}"

echo "======================================"
echo "  发布到 GitHub → Cloudflare Pages"
echo "  远程: ${REMOTE}    分支: ${BRANCH}"
echo "======================================"

# 暂存所有改动；仅当有内容时才提交
git add -A
if git diff --cached --quiet; then
  echo "→ 无新改动，跳过 commit"
else
  echo "→ 提交：${MSG}"
  git commit -m "$MSG"
fi

echo "→ 推送 ${BRANCH} 到 ${REMOTE}..."
git push -u "$REMOTE" "$BRANCH"

echo "======================================"
echo "  ✅ 已推送，Cloudflare Pages 将自动构建上线"
echo "======================================"
