#!/bin/bash

# Stop All - Para Docker Stack do Conductor CRM

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}🛑 Conductor CRM - Stop All${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Parar Docker Stack
echo -e "${BLUE}1️⃣  Parando Docker Stack...${NC}"
docker compose -f docker-compose.dev.yml down

echo ""
echo -e "${GREEN}✅ Tudo Parado!${NC}"
echo ""

echo -e "${BLUE}📝 Outros comandos úteis:${NC}"
echo "  • Parar e limpar volumes:  docker compose -f docker-compose.dev.yml down -v"
echo "  • Limpar tudo (cuidado):   docker compose -f docker-compose.dev.yml down -v --rmi all"
echo "  • Ver containers parados:  docker ps -a"
echo ""
