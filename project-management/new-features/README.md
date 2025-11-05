# 🚀 Como Usar Conductor como Core de Projetos Privados

> Guia direto ao ponto: 3 documentos essenciais

---

## TL;DR

```bash
# Criar CRM privado com Conductor
mkdir conductor-crm && cd conductor-crm
git init

# Adicionar core como submodules
git submodule add https://github.com/primoia/conductor.git src/conductor
git submodule add https://github.com/primoia/conductor-gateway.git src/conductor-gateway
git submodule add https://github.com/primoia/conductor-web.git src/conductor-web

# Adicionar seu código CRM
mkdir crm-backend crm-frontend

# docker-compose.yml orquestra tudo
# Pronto!
```

---

## 📚 Documentos

### 1. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) ⭐ COMECE AQUI
**Tempo**: 4-6 horas para setup completo

**O que tem**:
- Setup passo-a-passo com comandos exatos
- Docker Compose pronto
- Git hooks de segurança (copy-paste)
- Troubleshooting

**Use se**: Você quer implementar HOJE.

---

### 2. [OPENSOURCE_PRIVATE_STRATEGY.md](./OPENSOURCE_PRIVATE_STRATEGY.md)
**Tempo**: 30 min de leitura

**O que tem**:
- Como contribuir pro opensource mantendo código privado
- Git hooks de segurança
- Fluxos de trabalho (contribuir, atualizar, debug)
- Cenários práticos (bug crítico 2AM, feature urgente)

**Use se**: Você quer entender a estratégia e os workflows.

---

### 3. [CRM_IMPLEMENTATION_EXAMPLES.md](./CRM_IMPLEMENTATION_EXAMPLES.md)
**Tempo**: Referência contínua

**O que tem**:
- Código completo de agentes IA (LeadQualifier, EmailAssistant, DealPredictor)
- Backend FastAPI com integração ao Gateway
- Frontend Angular com componentes AI
- Workflows automatizados

**Use se**: Você está implementando features AI no CRM.

---

## 🎯 Ordem de Leitura

1. **QUICK_START_GUIDE.md** → Setup inicial
2. **OPENSOURCE_PRIVATE_STRATEGY.md** → Entender workflows
3. **CRM_IMPLEMENTATION_EXAMPLES.md** → Implementar features

---

## ✅ Resultado Final

```
conductor-crm/ (seu repo privado)
├── src/
│   ├── conductor/         (submodule opensource)
│   ├── conductor-gateway/ (submodule opensource)
│   └── conductor-web/     (submodule opensource)
├── crm-backend/           (seu código privado)
├── crm-frontend/          (seu código privado)
├── plugins/crm/           (seus agentes privados)
└── docker-compose.yml     (orquestra tudo)
```

**Separação**: Core opensource / Produto privado
**Contribuição**: Fácil via submodule
**Segurança**: Git hooks previnem leaks
**Deploy**: `docker-compose up`

---

**Status**: ✅ Pronto para uso
**Versão**: 1.0
**Última atualização**: 2025-11-04
