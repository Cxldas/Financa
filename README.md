# Personal Finance Manager (Full-Stack) 💸

Aplicação web completa para **gestão financeira pessoal**, com **multi-tenant por usuário** (isolamento por `userId`), **autenticação segura** (JWT access + refresh em cookie httpOnly com rotação), **CRUD de transações e categorias**, **relatórios**, **gráficos** e **exportação CSV** (respeitando filtros).

##  Features
- ✅ Cadastro/Login com senha forte
- ✅ Access Token curto + Refresh Token longo (cookie httpOnly + rotação)
- ✅ Multi-tenant: cada usuário vê apenas seus dados
- ✅ Transações (INCOME/EXPENSE) com filtros/paginação/ordenação
- ✅ Categorias customizadas + categorias padrão no onboarding
- ✅ Relatório mensal (America/Bahia) + top categorias
- ✅ Dashboard com gráficos (Pizza/Linha/Barras)
- ✅ Export CSV respeitando filtros
- ✅ Validação front + back (mensagens amigáveis)
- ✅ Testes E2E (auth, transações, isolamento, relatório, export)

---

##  Tech Stack
**Back-end**
- Node.js + TypeScript + NestJS
- Prisma ORM
- PostgreSQL
- Auth: JWT + Refresh Token (cookie httpOnly)

**Front-end**
- React + TypeScript + Vite
- TailwindCSS
- Recharts

**Infra**
- Docker Compose (Postgres)

---

## Estrutura do projeto

root/ docker-compose.yml backend/ frontend/

---

##  Pré-requisitos
- Node.js 20+
- Docker + Docker Compose
- npm (ou pnpm/yarn, se adaptar os comandos)

---

##  Como rodar localmente

### 1) Subir o banco (Postgres)
Na raiz do projeto:
```bash
docker compose up -d

Isso expõe o banco em localhost:5432.


---

2) Back-end

cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run start:dev

A API sobe em:

http://localhost:3001/api


Usuário demo (seed)

Email: demo@finance.app

Senha: DemoPass1



---

3) Front-end

cd frontend
cp .env.example .env
npm install
npm run dev

O front sobe em:

http://localhost:5173



---

 Autenticação (segura)

Access Token (JWT): ~15min (enviado em Authorization: Bearer)

Refresh Token: ~7 dias, guardado em cookie httpOnly

Rotação: a cada refresh, o refresh anterior é revogado e um novo é emitido

Armazenamento no banco: apenas hash (sha256) do refresh é persistido (protege contra vazamento do DB)


Fluxo:

1. POST /auth/login → retorna accessToken + seta cookie httpOnly do refresh


2. Quando o access expira, o front chama POST /auth/refresh (cookie vai automaticamente)


3. POST /auth/logout revoga refresh tokens ativos e limpa cookie




---

 Multi-tenant (isolamento por usuário)

Todas as tabelas de domínio possuem userId

Todas as queries filtram por userId

Detail/update/delete validam ownership com where: { id, userId }

Teste E2E garante que usuário B não acessa dados do usuário A



---

 Endpoints principais

Auth

POST /auth/register

POST /auth/login (rate limited)

POST /auth/refresh

POST /auth/logout

GET /auth/me


Categories

GET /categories

POST /categories

GET /categories/:id

PATCH /categories/:id

DELETE /categories/:id?reassignToCategoryId=...


Transactions

GET /transactions?page=&pageSize=&sortBy=&sortDir=&startDate=&endDate=&type=&categoryId=&q=

POST /transactions

GET /transactions/:id

PATCH /transactions/:id

DELETE /transactions/:id


Reports

GET /reports/monthly?year=&month=

ou GET /reports/monthly?startDate=&endDate=


GET /reports/compare-months?months=6


Export CSV

GET /export/transactions.csv?startDate=&endDate=&type=&categoryId=&q=



---

 Timezone (America/Bahia)

Transações armazenam date como DATE (sem hora)

Relatório mensal calcula intervalo do mês usando Luxon em America/Bahia

Filtros startDate/endDate são inclusivos



---

 Gráficos no dashboard

Pizza: despesas por categoria (top 5)

Linha: receitas vs despesas por dia

Barras: comparativo mês a mês (últimos 6 meses)


Todos respeitam o filtro de período.


---

 Exportação CSV

Exporta transações aplicando os mesmos filtros do endpoint de listagem

Campos:

date, type, description, category, amount, payment_method, notes


Escapa corretamente vírgulas/aspas/quebras de linha

Nome do arquivo:

transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv




---

 Testes

Back-end (E2E)

cd backend
npm run test:e2e

Inclui:

auth login/me

criação de transação

isolamento multi-tenant (IDOR)

relatório mensal

export CSV


Front-end (smoke)

cd frontend
npm run test


---


 Checklist de segurança

[x] Hash de senha (bcrypt)

[x] Refresh token httpOnly + rotação + hash no DB

[x] Rate limit no login

[x] CORS com origem configurável e credentials

[x] Helmet

[x] Validação de payloads (DTO + ValidationPipe)

[x] Proteção contra IDOR (sempre validar userId)

[x] Erros padronizados e logs básicos



