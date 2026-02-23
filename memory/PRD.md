# FinGestão - Sistema de Gestão Financeira Pessoal

## Visão Geral
Sistema web completo para controle financeiro pessoal desenvolvido em React + FastAPI + MongoDB, com autenticação JWT segura, multi-tenant por usuário, dashboard com gráficos, relatórios mensais e exportação CSV.

## Arquitetura

### Backend (FastAPI + MongoDB)
- **Autenticação**: JWT + Refresh Token (15min/7dias)
- **Segurança**: bcrypt hash, rate limiting, validação de payload
- **Multi-tenant**: Isolamento por user_id em todas as queries
- **Soft Delete**: deleted_at para transações

### Frontend (React + Tailwind + Shadcn UI)
- **Tema**: Dark mode padrão com toggle para light
- **Moeda**: BRL (R$ 1.234,56) formato brasileiro
- **Gráficos**: Recharts (pizza, linha, barra)
- **Responsivo**: Desktop sidebar + Mobile bottom nav

## User Personas
1. **Usuário Comum**: Controle básico de receitas/despesas
2. **Planejador Financeiro**: Metas, relatórios detalhados
3. **Freelancer**: Múltiplas fontes de renda, categorização

## Core Requirements (Implementados)
- [x] Cadastro/Login com validação de senha forte
- [x] JWT + Refresh Token com rotação
- [x] Rate limiting no login (5 tentativas/15min)
- [x] CRUD de Transações (receitas/despesas)
- [x] CRUD de Categorias personalizadas
- [x] Categorias brasileiras padrão no onboarding
- [x] Dashboard com cards de resumo
- [x] Gráficos: pizza por categoria, linha receita vs despesa, barras comparativo mensal
- [x] Relatórios mensais com comparação
- [x] Metas financeiras com progresso
- [x] Exportação CSV filtrada
- [x] Paginação e filtros nas listagens
- [x] Timezone America/Bahia
- [x] Dark/Light mode toggle

## What's Been Implemented (23/02/2026)

### Backend APIs
- POST /api/auth/register - Cadastro com categorias padrão
- POST /api/auth/login - Login com tokens
- POST /api/auth/refresh - Renovação de token
- POST /api/auth/logout - Invalidação de refresh token
- GET /api/auth/me - Dados do usuário logado
- PATCH /api/auth/settings - Atualizar nome/tema
- GET/POST /api/categories - Listar/criar categorias
- GET/PATCH/DELETE /api/categories/:id - CRUD categoria
- GET/POST /api/transactions - Listar/criar transações
- GET/PATCH/DELETE /api/transactions/:id - CRUD transação
- GET /api/reports/dashboard - Dados do dashboard
- GET /api/reports/monthly - Relatório mensal
- GET /api/reports/export - Export CSV
- GET/POST /api/goals - Listar/criar metas
- GET/PATCH/DELETE /api/goals/:id - CRUD metas

### Frontend Pages
- /login - Página de login
- /register - Página de cadastro
- /dashboard - Dashboard com cards e gráficos
- /transactions - Lista de transações com CRUD
- /categories - Gerenciamento de categorias
- /reports - Relatórios mensais
- /goals - Metas financeiras
- /settings - Configurações do usuário

## Prioritized Backlog

### P0 (Próximas iterações)
- [ ] Notificações de metas atingidas
- [ ] Transações recorrentes (mensais/semanais)
- [ ] Backup/restore de dados

### P1 (Melhorias)
- [ ] Gráfico de evolução do patrimônio
- [ ] Tags para transações
- [ ] Anexar comprovantes (fotos)
- [ ] Importar extrato bancário (OFX/CSV)

### P2 (Futuro)
- [ ] Contas bancárias múltiplas
- [ ] Suporte a múltiplas moedas
- [ ] API mobile (React Native)
- [ ] Planejamento orçamentário

## Next Tasks
1. Implementar transações recorrentes automáticas
2. Adicionar notificações push para metas
3. Melhorar filtros de período com presets (7d, 30d, 3m, 12m)
4. Dashboard widgets customizáveis
