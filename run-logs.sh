#!/bin/bash

# Logs - Mostra logs dos serviços

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Se nenhum argumento, mostrar todos
if [ $# -eq 0 ]; then
    echo ""
    echo -e "${BLUE}📋 Mostrando logs de TODOS os serviços...${NC}"
    echo -e "${YELLOW}   Use Ctrl+C para sair${NC}"
    echo ""
    docker compose -f docker-compose.dev.yml logs -f
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
        ["all"]=""
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
    echo -e "${BLUE}📋 Mostrando logs de:${GREEN}$services${NC}"
    echo -e "${YELLOW}   Use Ctrl+C para sair${NC}"
    echo ""
    docker compose -f docker-compose.dev.yml logs -f $services
fi
