#!/usr/bin/env bash
# Sobe o ORBITAL-GHG dentro de um GitHub Codespace.
#
# No Codespaces as portas viram URLs públicas (https://<codespace>-3000...),
# então o frontend precisa ser buildado apontando para a URL da API e o CORS
# da API precisa aceitar a URL do frontend — este script resolve os dois.
set -euo pipefail

if [ -z "${CODESPACE_NAME:-}" ]; then
  echo "Este script é para GitHub Codespaces. Localmente use: docker compose up -d --build"
  exit 1
fi

DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
export NEXT_PUBLIC_API_URL="https://${CODESPACE_NAME}-8000.${DOMAIN}"
export CORS_ORIGINS="[\"https://${CODESPACE_NAME}-3000.${DOMAIN}\"]"

echo "API:      ${NEXT_PUBLIC_API_URL}"
echo "Frontend: https://${CODESPACE_NAME}-3000.${DOMAIN}"
echo

docker compose up -d --build

# a porta 8000 precisa ser pública para o navegador chamar a API diretamente
if command -v gh >/dev/null 2>&1; then
  gh codespace ports visibility 8000:public -c "$CODESPACE_NAME" 2>/dev/null || true
fi

echo
echo "Pronto. Abra a aba PORTS e clique no globo (porta 3000),"
echo "ou acesse: https://${CODESPACE_NAME}-3000.${DOMAIN}"
