#!/bin/bash

# Status - Mostra status de todos os serviços

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Conductor CRM - Status${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Verificar se há containers rodando
if ! docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null | grep -q "Name"; then
    echo -e "${YELLOW}⚠️  Nenhum container rodando${NC}"
    echo ""
    echo -e "${BLUE}💡 Para iniciar:${NC} ./run-start-all-dev.sh"
    echo ""
    exit 0
fi

# Mostrar containers
echo -e "${BLUE}📦 Containers:${NC}"
echo ""
docker compose -f docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | sed 's/^/  /'

echo ""
echo -e "${BLUE}🎯 URLs (se serviços estão rodando):${NC}"
echo ""
echo -e "${GREEN}  🔓 Opensource Core:${NC}"
echo "     • Conductor Web: http://localhost:8081"
echo "     • Gateway API:   http://localhost:5008/api/v1/health"
echo "     • Conductor API: http://localhost:3001"
echo ""
echo -e "${BLUE}  🔒 CRM (Private):${NC}"
echo "     • CRM Frontend:  http://localhost:4200"
echo "     • CRM Backend:   http://localhost:5007/health"
echo ""
echo -e "${YELLOW}  💾 MongoDB: localhost:27017 (shared with community)${NC}"
echo ""

# Health checks rápidos (não bloquear se falhar)
echo -e "${BLUE}🏥 Health Checks:${NC}"
echo ""

check_health() {
    local name=$1
    local url=$2

    if timeout 2 curl -s "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
    else
        echo -e "  ${RED}✗${NC} $name ${YELLOW}(não respondendo)${NC}"
    fi
}

check_health "Gateway API" "http://localhost:5008/api/v1/health"
check_health "CRM Backend" "http://localhost:5007/health"
check_health "Conductor Web" "http://localhost:8081"

echo ""
echo -e "${BLUE}📝 Comandos úteis:${NC}"
echo "  • Ver logs:    ./run-logs.sh [service]"
echo "  • Restart:     ./run-restart.sh [service]"
echo "  • Parar tudo:  ./run-stop-all-dev.sh"
echo ""
