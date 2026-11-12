#!/bin/bash
set -euo pipefail

# RuleLoop 一键发版脚本
# 用法: ./deploy/release.sh

# 配置
REPO_URL="https://github.com/Ury479/se420_group-work_rule-loop.git"
BRANCH="main"
DEPLOY_ROOT="/root/ruleloop"
RELEASE_DIR="${DEPLOY_ROOT}/releases/$(date +%Y%m%d-%H%M)"
BACKUP_DIR="${DEPLOY_ROOT}/backups"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# 检查命令是否存在
check_command() {
  if ! command -v "$1" &> /dev/null; then
    error "$1 未安装"
    exit 1
  fi
}

# 前置检查
log "开始部署检查..."
check_command git
check_command docker
check_command docker-compose

# 检查是否在正确的目录
if [ ! -d "${DEPLOY_ROOT}" ]; then
  error "部署目录 ${DEPLOY_ROOT} 不存在"
  exit 1
fi

# 创建必要的目录
mkdir -p "${RELEASE_DIR}"
mkdir -p "${BACKUP_DIR}"

log "创建新 release: ${RELEASE_DIR}"

# 克隆代码
log "从 GitHub 拉取最新代码 (${BRANCH})..."
cd "${RELEASE_DIR}"
git clone --depth 1 -b "${BRANCH}" "${REPO_URL}" .

# 复制环境变量
if [ -f "${DEPLOY_ROOT}/.env" ]; then
  log "复制环境变量..."
  cp "${DEPLOY_ROOT}/.env" .
else
  error ".env 文件不存在: ${DEPLOY_ROOT}/.env"
  exit 1
fi

# 检查 DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
  error ".env 中缺少 DATABASE_URL"
  exit 1
fi

# 构建镜像
log "构建 Docker 镜像..."
docker compose build web migrate

# 备份数据库（可选，如果配置了备份）
# log "备份数据库..."
# BACKUP_FILE="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M).sql"
# 需要配置 pg_dump 或使用 Neon 的备份功能

# 执行数据库迁移
log "执行数据库迁移..."
if ! docker compose run --rm migrate; then
  error "数据库迁移失败"
  exit 1
fi

# 启动新容器
log "启动新容器..."
if ! docker compose up -d --no-deps --wait web; then
  error "容器启动失败"
  exit 1
fi

# 等待服务就绪
log "等待服务就绪..."
sleep 5

# 健康检查
log "执行健康检查..."
HEALTH_CHECK_URL="http://localhost:3000"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f -s "${HEALTH_CHECK_URL}" > /dev/null 2>&1; then
    log "健康检查通过"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  warn "健康检查失败，重试 ${RETRY_COUNT}/${MAX_RETRIES}..."
  sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  error "健康检查失败，开始回滚..."
  
  # 回滚到上一版本
  cd "${DEPLOY_ROOT}"
  PREV_RELEASE=$(ls -t releases/ | grep -v "$(basename ${RELEASE_DIR})" | head -1)
  
  if [ -n "$PREV_RELEASE" ]; then
    warn "回滚到上一版本: ${PREV_RELEASE}"
    cd "${DEPLOY_ROOT}/releases/${PREV_RELEASE}"
    docker compose up -d --no-deps --wait web
    
    # 删除失败的 release
    rm -rf "${RELEASE_DIR}"
    
    error "部署失败，已回滚"
    exit 1
  else
    error "没有可回滚的版本"
    exit 1
  fi
fi

# 切换 current 符号链接
log "切换 current 符号链接..."
cd "${DEPLOY_ROOT}"
ln -sfn "${RELEASE_DIR}" current

# 清理旧容器
log "清理旧容器..."
cd "${RELEASE_DIR}"
docker compose down --remove-orphans || true

# 清理旧版本（保留最近 5 个）
log "清理旧版本..."
cd "${DEPLOY_ROOT}/releases"
ls -t | tail -n +6 | xargs rm -rf 2>/dev/null || true

# 完成
log "========================================="
log "部署成功！"
log "版本: $(basename ${RELEASE_DIR})"
log "访问: https://ruleloop.xiaobulab.cn"
log "========================================="

# 显示容器状态
docker compose -f "${RELEASE_DIR}/docker-compose.yml" ps
