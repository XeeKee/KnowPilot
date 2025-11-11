#!/bin/bash
GREEN='\033[0;32m'
NC='\033[0m'

# 脚本的核心是传递所有参数给 docker-compose 命令
# 这样就可以用 ./stop.sh logs, ./stop.sh ps, ./stop.sh exec backend bash 等

if [ "$1" == "" ]; then
    echo -e "${GREEN}🛑 停止并移除所有 CollabThink 容器...${NC}"
    docker compose -f docker/docker-compose.yml down
    echo -e "${GREEN}✅ 服务已停止。${NC}"
else
    # 将所有命令行参数传递给 docker-compose
    docker compose -f docker/docker-compose.yml "$@"
fi
