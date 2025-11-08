#!/usr/bin/env bash
set -e

echo "🚀 Configurando QA ERP Agent (Gemini)..."
echo

# 1️⃣ Instalar dependências
echo "📦 Instalando dependências..."
npm install --silent

# 2️⃣ Garantir tipos necessários
echo "🧩 Instalando tipos do Node e Octokit..."
npm install --save-dev @types/node
npm install @octokit/rest --save

# 3️⃣ Limpar cache do TypeScript
echo "🧹 Limpando build anterior..."
npx tsc --build --clean

# 4️⃣ Compilar novamente
echo "🏗️ Compilando projeto..."
npm run build

# 5️⃣ Configurar variáveis de ambiente
echo
read -p "🧠 Informe sua GOOGLE_API_KEY (Gemini): " GOOGLE_API_KEY
read -p "🔑 Informe seu GITHUB_TOKEN (PAT ou token clássico): " GITHUB_TOKEN
export GOOGLE_API_KEY
export GITHUB_TOKEN

echo
echo "✅ Variáveis configuradas:"
echo "   GOOGLE_API_KEY=${GOOGLE_API_KEY:0:5}********"
echo "   GITHUB_TOKEN=${GITHUB_TOKEN:0:5}********"
echo

# 6️⃣ Testar execução
read -p "Deseja testar uma PR (p) ou Commit (c)? " choice
if [ "$choice" = "p" ]; then
  read -p "👤 GitHub Owner/Org: " OWNER
  read -p "📁 Repo: " REPO
  read -p "🔢 Número da PR: " PR
  echo "🧠 Rodando análise de PR..."
  node dist/run-local.js --owner "$OWNER" --repo "$REPO" --pr "$PR"
elif [ "$choice" = "c" ]; then
  read -p "👤 GitHub Owner/Org: " OWNER
  read -p "📁 Repo: " REPO
  read -p "🔢 SHA do Commit: " COMMIT
  echo "🧠 Rodando análise de Commit..."
  node dist/run-local.js --owner "$OWNER" --repo "$REPO" --commit "$COMMIT"
else
  echo "🟡 Nenhum teste executado — apenas configuração concluída."
fi

echo
echo "🎉 Pronto! O QA ERP Agent (Gemini) foi configurado com sucesso."
