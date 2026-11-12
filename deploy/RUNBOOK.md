# RuleLoop 部署运维手册

## 生产环境信息

- **服务器**: 103.108.67.49 (root@103.108.67.49)
- **域名**: https://ruleloop.xiaobulab.cn
- **部署目录**: `/root/ruleloop`
- **容器编排**: Docker Compose
- **数据库**: Neon Postgres (DATABASE_URL in .env)

## 目录结构

```
/root/ruleloop/
├── current/           # 当前生产版本的符号链接
├── releases/          # 历史发布版本（按时间戳命名）
│   ├── 20261112-0730/
│   ├── 20261112-0845/
│   └── ...
├── .env               # 环境变量（DATABASE_URL等）
├── docker-compose.yml # 容器编排配置
└── deploy/
    └── release.sh     # 一键发版脚本
```

## 发版流程

### 自动发版（推荐）

```bash
# 在服务器上执行
cd /root/ruleloop
./deploy/release.sh
```

脚本会自动：
1. 从 GitHub 拉取最新 main 分支
2. 创建新 release 目录（时间戳命名）
3. 构建 web 和 migrate 镜像
4. 备份数据库
5. 执行数据库迁移
6. 启动新容器（`docker compose up -d --no-deps --wait web`）
7. 验证健康检查
8. 切换 current 符号链接
9. 失败时自动回滚到上一版本

### 手动发版

```bash
# 1. 创建新 release 目录
RELEASE_DIR="releases/$(date +%Y%m%d-%H%M)"
mkdir -p $RELEASE_DIR
cd $RELEASE_DIR

# 2. 克隆代码
git clone --depth 1 -b main https://github.com/Ury479/se420_group-work_rule-loop.git .

# 3. 复制环境变量
cp ../../.env .

# 4. 构建镜像
docker compose build web migrate

# 5. 备份数据库（如果有备份配置）
# pg_dump $DATABASE_URL > ../../backups/backup-$(date +%Y%m%d-%H%M).sql

# 6. 执行迁移
docker compose run --rm migrate

# 7. 启动新容器
docker compose up -d --no-deps --wait web

# 8. 验证健康检查
curl -f http://localhost:3000/api/health || exit 1

# 9. 切换 current
ln -sfn $RELEASE_DIR ../../current

# 10. 清理旧容器
docker compose down --remove-orphans
```

## 回滚流程

```bash
# 切换回上一版本
cd /root/ruleloop
PREV_RELEASE=$(ls -t releases/ | sed -n '2p')
ln -sfn releases/$PREV_RELEASE current
cd current
docker compose up -d --no-deps --wait web
```

## 日常运维

### 查看日志

```bash
cd /root/ruleloop/current
docker compose logs -f web
docker compose logs -f --tail=100 web
```

### 重启服务

```bash
cd /root/ruleloop/current
docker compose restart web
```

### 更新环境变量

```bash
# 编辑 .env
vim /root/ruleloop/.env

# 重启服务使其生效
cd /root/ruleloop/current
docker compose up -d --no-deps web
```

### 清理旧版本

```bash
# 保留最近 5 个版本，删除其余
cd /root/ruleloop/releases
ls -t | tail -n +6 | xargs rm -rf
```

### 数据库迁移（独立执行）

```bash
cd /root/ruleloop/current
docker compose run --rm migrate
```

## 健康检查

```bash
# HTTP 健康检查
curl -f http://localhost:3000/api/health

# 容器状态
docker compose ps

# 数据库连接测试
docker compose exec web node -e "require('pg').Pool({ connectionString: process.env.DATABASE_URL }).query('SELECT 1')"
```

## 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker compose logs web

# 检查端口占用
netstat -tulpn | grep 3000

# 重建镜像
docker compose build --no-cache web
```

### 数据库连接失败

```bash
# 检查 DATABASE_URL
cat /root/ruleloop/.env | grep DATABASE_URL

# 测试数据库连通性
docker compose exec web psql $DATABASE_URL -c "SELECT 1"
```

### 磁盘空间不足

```bash
# 清理 Docker 资源
docker system prune -a --volumes

# 查看磁盘使用
df -h
du -sh /root/ruleloop/releases/*
```

## 安全注意事项

- `.env` 文件权限应为 600 (`chmod 600 .env`)
- DATABASE_URL 包含敏感凭据，不要提交到代码仓库
- 定期更新 Docker 镜像基础层
- 定期备份数据库

## 监控指标

- **响应时间**: 首页加载 < 2s
- **错误率**: < 1%
- **内存使用**: < 1GB
- **数据库连接数**: < 10

## 联系人

- **开发**: 用户本人
- **服务器**: root@103.108.67.49
