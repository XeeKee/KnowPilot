#!/bin/bash
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 启动 CollabThink Docker 服务...${NC}"

# 检查 .env 文件是否存在
if [ ! -f "docker/.env" ]; then
    echo -e "${RED}❌ 错误: docker/.env 文件未找到!${NC}"
    echo -e "请从 docker/.env.example 复制并创建 .env 文件: "
    echo -e "  ${GREEN}cp docker/.env.example docker/.env${NC}"
    exit 1
fi

# 使用新版 docker compose 命令启动服务
# --build: 强制重新构建镜像
# -d: 后台运行
docker compose -f docker/docker-compose.yml up -d
STATUS=$?

if [ $STATUS -eq 0 ]; then
    echo -e "\n${GREEN}✅ 服务启动完成!${NC}"
    echo "----------------------------------------"
    echo -e "🔗 前端访问地址: ${GREEN}http://localhost${NC}"
    echo -e "🔗 后端 API 地址: ${GREEN}http://localhost:5000${NC}"
    echo -e "🗄️  数据库端口: ${GREEN}5432${NC}"
    echo "----------------------------------------"
    echo -e "\n📋 查看所有服务日志: ${GREEN}./stop.sh logs${NC}"
    echo -e "📋 查看后端日志: ${GREEN}./stop.sh logs backend${NC}"
else
    echo -e "\n${RED}❌ 服务启动失败（docker compose 返回码: $STATUS）。请先查看日志并修复后重试。${NC}"
    echo -e "📋 查看构建/启动日志建议: ${GREEN}docker compose -f docker/docker-compose.yml logs --no-log-prefix | sed -n '1,200p'${NC}"
    exit $STATUS
fi
