#!/bin/bash

# Restart - Reinicia serviços específicos ou todos

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Se nenhum argumento, restart em tudo
if [ $# -eq 0 ]; then
    echo ""
    echo -e "${BLUE}🔄 Reiniciando TODOS os serviços...${NC}"
    echo ""
    docker compose -f docker-compose.dev.yml restart
    echo ""
    echo -e "${GREEN}✅ Todos os serviços reiniciados!${NC}"
    echo ""
else
    # Mapear aliases para nomes reais dos serviços
    declare -A service_map=(
        ["backend"]="crm-backend"
        ["frontend"]="crm-frontend"
        ["api"]="conductor-api"
        ["conductor"]="conductor-api"
        ["gateway"]="gateway"
        ["web"]="web"
        ["mongo"]="mongodb"
        ["mongodb"]="mongodb"
        ["crm"]="crm-backend crm-frontend"
        ["core"]="conductor-api gateway web"
    )

    # Resolver serviços
    services=""
    for arg in "$@"; do
        if [[ -n "${service_map[$arg]}" ]]; then
            services="$services ${service_map[$arg]}"
        else
            services="$services $arg"
        fi
    done

    echo ""
    echo -e "${BLUE}🔄 Reiniciando:${GREEN}$services${NC}"
    echo ""
    docker compose -f docker-compose.dev.yml restart $services
    echo ""
    echo -e "${GREEN}✅ Serviços reiniciados!${NC}"
    echo ""
fi

echo -e "${BLUE}📝 Ver logs:${NC} ./run-logs.sh $@"
echo ""
