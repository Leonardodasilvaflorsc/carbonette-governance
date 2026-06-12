# ORBITAL-GHG

Plataforma de **inteligência de emissões de gases de efeito estufa via satélite**
(white-label — nome configurável via `NEXT_PUBLIC_APP_NAME`).

Globo 3D com camadas orbitais de CH₄, CO₂, NO₂, SO₂ e CO; atlas de emissores por
instalação (Climate TRACE); análise quantitativa MRV-grade (TROPOMI); detecção de
plumas (Carbon Mapper); e geração de dossiês técnicos de evidência para projetos
de descarbonização.

## Setup em 5 comandos

```sh
git clone <repo-url> && cd carbonette-governance   # 1. clonar
cp .env.example .env                                # 2. configurar (defaults de dev funcionam)
docker compose up -d --build                        # 3. subir tudo
curl http://localhost:8000/health                   # 4. healthcheck da API (status: ok)
open http://localhost:3000                          # 5. abrir o globo
```

Serviços expostos: web `:3000` · API `:8000` (docs em `/docs`) · Postgres `:5432` ·
Redis `:6379` · MinIO `:9000` (console `:9001`).

## Estrutura do monorepo

```
apps/web          Next.js 14 (App Router) + MapLibre GL v5 (globo) + Tailwind
apps/api          FastAPI + Pydantic v2 (Python 3.11)
packages/shared   Constantes compartilhadas: gases, camadas GIBS, design tokens
infra/db          Init SQL (PostGIS + TimescaleDB)
legacy/lovable-app  App anterior (Vite/Supabase), preservado para referência
```

## Desenvolvimento local (sem Docker para os apps)

Infraestrutura via Docker, apps com hot-reload local:

```sh
docker compose up -d db redis minio minio-setup

# API (terminal 1)
cd apps/api
pip install -e ".[dev]"
DATABASE_URL=postgresql://orbital:orbital-dev-password@localhost:5432/orbital \
REDIS_URL=redis://localhost:6379/0 \
uvicorn app.main:app --reload

# Web (terminal 2)
pnpm install
pnpm dev          # http://localhost:3000
```

## Atlas de Emissores (Climate TRACE)

Sincronize o inventário por instalação para o PostGIS (job idempotente,
recomendado mensal):

```sh
cd apps/api
python -m app.jobs.ingest_facilities          # API real (requer rede)
python -m app.jobs.ingest_facilities --mock   # fixtures de demonstração
```

Sem banco alcançável a API serve fixtures em memória e declara
`source: "mock"` nas respostas — a UI exibe o aviso correspondente.

## Testes e qualidade

```sh
pnpm lint && pnpm typecheck && pnpm test    # frontend + shared
cd apps/api && ruff check . && pytest        # backend
```

## Variáveis de ambiente

Todas documentadas em [`.env.example`](.env.example). **Nenhuma chave é necessária
para rodar as FASES 0–1** — o globo usa NASA GIBS (WMTS público). Chaves de
CDSE, Carbon Mapper, Google Earth Engine, CDS/ERA5 e SMTP entram nas fases 2–6.

## Princípios não negociáveis

- **Concentração ≠ emissão**: coluna atmosférica (molec/cm², ppb) nunca é
  apresentada como fluxo (kg/h, t/ano). Os tipos em `packages/shared` codificam
  essa distinção.
- **Dois trilhos de dados**: visualização imediata via tiles GIBS no cliente
  (Trilho A) e quantitativo processado pelo backend (Trilho B).
- **Incerteza e rastreabilidade declaradas** em todo número publicado
  (produto, versão de algoritmo, filtro de qualidade, período).
- Provedores de dados externos sempre atrás de interface abstrata
  (`EmissionsDataProvider`) com mock para desenvolvimento offline.
