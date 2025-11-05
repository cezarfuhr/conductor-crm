#!/bin/bash

# Start All - Inicia Docker Stack do Conductor CRM

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Conductor CRM - Start All (Dev)${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Verificar Docker
echo -e "${BLUE}1️⃣  Verificando Docker...${NC}"
if ! docker info &>/dev/null; then
    echo -e "${RED}❌ Docker não está rodando${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker OK${NC}"
echo ""

# 2. Verificar submodules
echo -e "${BLUE}2️⃣  Verificando submodules...${NC}"
if [ ! -d "conductor/conductor/.git" ]; then
    echo -e "${YELLOW}⚠️  Submodules não inicializados. Inicializando...${NC}"
    git submodule update --init --recursive
fi
echo -e "${GREEN}✓ Submodules OK${NC}"
echo ""

# 3. Verificar arquivos .env
echo -e "${BLUE}3️⃣  Verificando configurações...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Copiando .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}   ⚠️  ATENÇÃO: Configure suas API keys em .env antes de continuar!${NC}"
    read -p "   Pressione ENTER para continuar ou Ctrl+C para cancelar..."
fi
echo -e "${GREEN}✓ Configurações OK${NC}"
echo ""

# 4. Subir Docker Stack
echo -e "${BLUE}4️⃣  Iniciando Docker Stack (dev)...${NC}"
echo -e "${YELLOW}   Isso pode levar alguns minutos na primeira vez...${NC}"
echo ""

docker compose -f docker-compose.dev.yml up -d --build

echo ""
echo -e "${GREEN}✓ Docker Stack iniciada${NC}"
echo ""

# 5. Aguardar serviços iniciarem
echo -e "${BLUE}5️⃣  Aguardando serviços iniciarem...${NC}"
sleep 10
echo -e "${GREEN}✓ Serviços prontos${NC}"
echo ""

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Tudo Iniciado!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 6. Mostrar status
echo -e "${BLUE}📦 Containers:${NC}"
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${BLUE}🎯 Acesse:${NC}"
echo ""
echo -e "${GREEN}  🔓 Opensource Core:${NC}"
echo "     • Conductor Web: http://localhost:8081"
echo "     • Gateway API:   http://localhost:5008"
echo "     • Conductor API: http://localhost:3001"
echo ""
echo -e "${BLUE}  🔒 CRM (Private):${NC}"
echo "     • CRM Frontend:  http://localhost:4200"
echo "     • CRM Backend:   http://localhost:5007"
echo ""
echo -e "${YELLOW}  💾 MongoDB: localhost:27017 (shared with community)${NC}"
echo ""

echo -e "${BLUE}📝 Comandos úteis:${NC}"
echo "  • Ver logs:          docker compose -f docker-compose.dev.yml logs -f"
echo "  • Ver logs CRM:      docker compose -f docker-compose.dev.yml logs -f crm-backend crm-frontend"
echo "  • Ver logs Core:     docker compose -f docker-compose.dev.yml logs -f conductor-api gateway web"
echo "  • Restart serviço:   docker compose -f docker-compose.dev.yml restart <service>"
echo "  • Parar tudo:        ./run-stop-all-dev.sh"
echo ""

echo -e "${YELLOW}💡 Dica: Os volumes estão montados com hot-reload!${NC}"
echo "   • Mudanças em src/backend/ → auto-reload"
echo "   • Mudanças em src/frontend/ → auto-reload"
echo ""
