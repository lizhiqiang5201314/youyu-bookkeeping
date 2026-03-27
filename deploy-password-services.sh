#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_REF_FILE="$ROOT_DIR/supabase/.temp/project-ref"
FUNCTIONS=(
  "set-password"
  "password-status"
  "password-login"
  "password-register"
)

if ! command -v npx >/dev/null 2>&1; then
  echo "npx 不可用，请先安装 Node.js / npm。"
  exit 1
fi

if [[ ! -f "$PROJECT_REF_FILE" ]]; then
  echo "未找到 $PROJECT_REF_FILE，项目似乎还没有 link 到 Supabase。"
  exit 1
fi

PROJECT_REF="$(tr -d '[:space:]' < "$PROJECT_REF_FILE")"

run_supabase() {
  npx --yes supabase "$@"
}

echo "检查 Supabase 登录与项目链接..."
run_supabase projects list >/dev/null
echo "已链接项目: $PROJECT_REF"

echo "开始部署密码相关 Edge Functions..."
for fn in "${FUNCTIONS[@]}"; do
  echo "  - 部署 $fn"
  run_supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --use-api
done

if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "检测到 SUPABASE_DB_PASSWORD，开始推送数据库迁移..."
  run_supabase db push --linked -p "$SUPABASE_DB_PASSWORD" --include-all
elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo "检测到 SUPABASE_DB_URL，开始推送数据库迁移..."
  run_supabase db push --db-url "$SUPABASE_DB_URL" --include-all
else
  echo "未检测到数据库连接凭据，已跳过 db push。"
  echo "如需推送迁移，请先设置 SUPABASE_DB_PASSWORD 或 SUPABASE_DB_URL。"
  echo "本次需要的迁移文件: supabase/migrations/20260327_sync_password_auth_schema.sql"
fi

echo "部署流程执行完成。"
