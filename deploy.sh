#!/bin/bash
set -e

echo "🚀 Deploying Unifarr to TrueNAS..."

# Configuration
TRUENAS_HOST="10.0.0.141"
TRUENAS_USER="truenas_admin"
DEPLOY_PATH="/mnt/storage/apps/unifarr"

echo "📦 Creating deployment package..."
tar czf unifarr-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=backend/data \
  --exclude=backend/downloads \
  --exclude=frontend/.nuxt \
  --exclude=frontend/.output \
  backend frontend docker-compose.yml

echo "📤 Uploading to TrueNAS..."
scp unifarr-deploy.tar.gz ${TRUENAS_USER}@${TRUENAS_HOST}:/tmp/

echo "🔧 Deploying on TrueNAS..."
ssh ${TRUENAS_USER}@${TRUENAS_HOST} bash <<'EOF'
set -e

DEPLOY_PATH="/mnt/storage/apps/unifarr"

# Create deploy directory
sudo mkdir -p ${DEPLOY_PATH}
cd ${DEPLOY_PATH}

# Stop existing containers
if [ -f docker-compose.yml ]; then
  echo "⏹️  Stopping existing containers..."
  sudo docker compose down || true
fi

# Extract new version
echo "📂 Extracting..."
sudo tar xzf /tmp/unifarr-deploy.tar.gz -C ${DEPLOY_PATH}
rm /tmp/unifarr-deploy.tar.gz

# Create data directories
sudo mkdir -p backend/data backend/downloads

# Build and start
echo "🏗️  Building containers..."
sudo docker compose build

echo "▶️  Starting containers..."
sudo docker compose up -d

echo "✅ Deployment complete!"
sudo docker compose ps
EOF

# Clean up
rm unifarr-deploy.tar.gz

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🌐 Frontend: http://10.0.0.141:3000"
echo "🔧 Backend:  http://10.0.0.141:3002"
echo ""
echo "📊 Check logs: ssh ${TRUENAS_USER}@${TRUENAS_HOST} 'cd /mnt/storage/apps/unifarr && sudo docker compose logs -f'"
