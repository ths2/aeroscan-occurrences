#!/usr/bin/env bash

set -euo pipefail

echo "🚁 AeroScan bootstrap"
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo

# --------------------------------------------------
# Pre-flight
# --------------------------------------------------

for command in git node npm docker; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "❌ '$command' não encontrado."
    exit 1
  fi
done

if [ -e backend ] || [ -e frontend ]; then
  echo "❌ backend/ ou frontend/ já existem."
  echo "Execute o bootstrap em um repositório limpo."
  exit 1
fi

# --------------------------------------------------
# Project files
# --------------------------------------------------

cat > .gitignore <<'EOF'
node_modules/
dist/
coverage/
.angular/

.env
.env.*
!.env.example

*.log
.DS_Store
EOF

echo "22.23.3" > .nvmrc

# --------------------------------------------------
# Backend
# Official NestJS TypeScript Starter
# --------------------------------------------------

echo
echo "📦 Clonando starter oficial do NestJS..."

git clone --depth 1 \
  https://github.com/nestjs/typescript-starter.git \
  backend

rm -rf backend/.git

echo
echo "📦 Instalando backend a partir do lockfile..."

(
  cd backend
  npm ci
)

# --------------------------------------------------
# Frontend
# Angular 22
# --------------------------------------------------

echo
echo "🅰️ Criando Angular..."

npx --yes @angular/cli@22 new frontend \
  --standalone \
  --strict \
  --routing=false \
  --style=css \
  --ssr=false \
  --skip-git \
  --skip-install \
  --defaults

echo
echo "📦 Instalando frontend..."

(
  cd frontend
  npm install
)

# --------------------------------------------------
# MongoDB
# --------------------------------------------------

echo
echo "🍃 Configurando MongoDB..."

cat > docker-compose.yml <<'EOF'
services:
  mongodb:
    image: mongo:8
    container_name: aeroscan-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: aeroscan
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
EOF

# --------------------------------------------------
# Environment example
# --------------------------------------------------

cat > backend/.env.example <<'EOF'
PORT=3000
MONGODB_URI=mongodb://localhost:27017/aeroscan
EOF

# --------------------------------------------------
# Required frontend build directory
# --------------------------------------------------

mkdir -p frontend-dist
touch frontend-dist/.gitkeep

echo
echo "================================================"
echo "✅ AeroScan foundation created"
echo "================================================"
echo
echo "backend/        NestJS official starter"
echo "frontend/       Angular 22"
echo "frontend-dist/  final compiled frontend"
echo "docker-compose  MongoDB"
echo
echo "Next:"
echo "  docker compose up -d"
echo
