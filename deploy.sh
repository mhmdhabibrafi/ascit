#!/bin/bash
# ASCIT Deploy Script - Sync local files to server and rebuild
# Usage: bash deploy.sh
set -e

SERVER_USER="mhmdhabibrafi"
SERVER_HOST="server.mhmdhabibrafi.me"
REMOTE_DIR="~/ascit"

echo "=== ASCIT Deploy ==="
echo "Target: ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}"
echo ""

# Sync source files to server (exclude node_modules, .next, .git, etc.)
echo "[1/3] Syncing source files to server..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='ascit.tar.gz' \
  --exclude='scratch-deploy' \
  --exclude='tsconfig.tsbuildinfo' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

echo ""
echo "[2/3] Building Docker image on server..."
ssh -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" \
  "cd ${REMOTE_DIR} && export DOCKER_BUILDKIT=1 && docker compose build --no-cache ascit-app"

echo ""
echo "[3/3] Restarting container..."
ssh -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" \
  "cd ${REMOTE_DIR} && docker compose up -d --force-recreate ascit-app"

echo ""
echo "=== Deploy selesai! ==="
echo "App: https://ascit.mhmdhabibrafi.me"
