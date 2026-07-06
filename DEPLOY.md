# Deploy do ORBITAL-GHG

Dois caminhos suportados. Se está começando, use a **Opção A** (menos passos,
sem administrar servidor). A **Opção B** custa menos em escala e mantém tudo
numa máquina só.

> **Regra que vale para os dois:** o banco PRECISA ser a imagem
> `timescale/timescaledb-ha:pg16` (traz PostGIS **e** TimescaleDB — as
> migrações criam hypertables e geometrias). Postgres gerenciado comum
> (Neon, RDS básico, Supabase) vai falhar na migração 002.

---

## Opção A — Vercel (frontend) + Railway (API, banco, Redis)

Custo típico inicial: Vercel grátis + Railway ~US$ 5–10/mês.
Você precisa criar as contas e fazer login quando o CLI pedir — o resto é
copiar/colar (ou pedir para o Claude Code na sua máquina executar).

### A.1 — Railway (backend)

1. Crie conta em railway.app e instale o CLI: `npm i -g @railway/cli && railway login`
2. No diretório do repo: `railway init` (crie um projeto novo).
3. **Banco**: no dashboard, *New Service → Docker Image* →
   `timescale/timescaledb-ha:pg16`. Em Variables defina `POSTGRES_DB=orbital`,
   `POSTGRES_USER=orbital`, `POSTGRES_PASSWORD=<openssl rand -hex 32>`.
   Em Settings → Volumes, monte um volume em `/home/postgres/pgdata/data`.
4. **Redis**: *New Service → Database → Redis*.
5. **API**: *New Service → GitHub Repo* apontando para este repositório,
   Root Directory = `apps/api` (o `railway.toml` cuida do build e start).
   Variables:
   ```
   DATABASE_URL=postgresql://orbital:<senha>@<host-interno-do-db>:5432/orbital
   REDIS_URL=<REDIS_URL do serviço Redis>
   JWT_SECRET=<openssl rand -hex 32>
   CORS_ORIGINS=["https://SEU-APP.vercel.app"]
   APP_NAME=ORBITAL-GHG
   ```
   Em Settings → Networking, gere o domínio público (ex.:
   `orbital-api.up.railway.app`).
6. **Worker e Beat** (jobs e alertas): duplique o serviço da API duas vezes,
   mesmo Root Directory, mudando só o Start Command:
   - worker: `celery -A app.workers.celery_app worker --loglevel=info`
   - beat: `celery -A app.workers.celery_app beat --loglevel=info`
7. Teste: `curl https://<dominio-da-api>/health` → esperado
   `{"status":"ok",...}` com database e redis `ok`.

### A.2 — Vercel (frontend)

1. Crie conta em vercel.com e importe o repositório (Add New → Project).
2. Configurações do projeto:
   - **Root Directory**: `apps/web`
   - Framework: Next.js (detectado); o pnpm workspace é detectado sozinho.
   - Environment Variables:
     ```
     NEXT_PUBLIC_API_URL=https://<dominio-da-api-no-railway>
     NEXT_PUBLIC_APP_NAME=ORBITAL-GHG
     ```
3. Deploy. Depois volte no Railway e ajuste `CORS_ORIGINS` com a URL final
   do Vercel (incluindo domínio próprio, se configurar).

---

## Opção B — VPS única com Docker Compose + HTTPS automático

Requisitos: uma VPS (Hetzner CX22 / DigitalOcean básica, ~US$ 5–8/mês) com
Docker instalado, e dois subdomínios com DNS A apontando para o IP dela
(ex.: `app.suaempresa.com.br` e `api.suaempresa.com.br`).

```sh
# na VPS
git clone https://github.com/Leonardodasilvaflorsc/carbonette-governance.git
cd carbonette-governance
cp deploy/.env.example deploy/.env
nano deploy/.env                      # preencha domínios e segredos (openssl rand -hex 32)
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

O Caddy emite os certificados HTTPS sozinho na primeira requisição.
Sobe: web, api (2 workers), worker Celery, beat (alertas diários), banco
Timescale+PostGIS, Redis e MinIO — nada exposto além de 80/443.

Atualizar versão depois de mergear mudanças:

```sh
git pull && docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

---

## Pós-deploy (qualquer opção)

1. **Criar o admin**: abra o app → Entrar → "Primeiro acesso — criar conta
   admin". O primeiro usuário do sistema vira administrador.
2. **Popular dados reais** (senão tudo aparece como "demonstração"):
   ```sh
   # com as variáveis do ambiente de produção (Railway: railway run …)
   cd apps/api
   python -m app.jobs.ingest_facilities                       # Climate TRACE → PostGIS
   python -m app.jobs.ingest_plumes --bbox=-54,-29.5,-48,-25.8  # Carbon Mapper (região de interesse)
   ```
   Agende mensalmente (cron da VPS ou Railway cron job).
3. **Credenciais de dados** (quando tiver): `CARBON_MAPPER_API_KEY`,
   `GEE_SERVICE_ACCOUNT_EMAIL/KEY_FILE` (séries TROPOMI reais em vez de
   sintéticas), `SMTP_*` (alertas por e-mail).
4. **Primeira validação com rede aberta**: os parsers de Climate TRACE e
   Carbon Mapper foram escritos contra o esquema documentado mas sem acesso
   às APIs vivas — se a primeira ingestão der erro de parsing, abra uma issue
   com o log que o ajuste é pequeno.

## Checklist de segurança

- [ ] `JWT_SECRET`, `POSTGRES_PASSWORD` e `S3_SECRET_KEY` gerados com
      `openssl rand -hex 32` (nunca os defaults de dev)
- [ ] `CORS_ORIGINS` restrito ao domínio real do frontend
- [ ] Banco e Redis sem portas públicas (Opção B já faz isso; no Railway são
      internos por padrão)
- [ ] Backup do volume do Postgres (Railway: automático em planos pagos;
      VPS: `pg_dump` agendado)

## Nota sobre o Lovable

Este repositório estava conectado ao Lovable (app antigo, preservado em
`legacy/lovable-app/`). Após o merge deste monorepo na `main`, a
sincronização do Lovable com o repo deixa de funcionar — a plataforma nova
roda em Vercel/Railway/VPS conforme acima, não no Lovable.
