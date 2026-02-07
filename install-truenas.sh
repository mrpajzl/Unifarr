#!/bin/bash
# Unifarr TrueNAS Quick Install

set -e

INSTALL_DIR="/mnt/storage/apps/unifarr"
API_BASE="http://10.0.0.141:3002"

echo "🚀 Installing Unifarr on TrueNAS..."

# Create directory
sudo mkdir -p ${INSTALL_DIR}
cd ${INSTALL_DIR}

# Download docker-compose.yml
echo "📥 Downloading configuration..."
curl -fsSL https://raw.githubusercontent.com/mrpajzl/unifarr/main/docker-compose.prod.yml -o docker-compose.yml

# Update API base URL
sed -i '' "s|http://10.0.0.141:3002|${API_BASE}|g" docker-compose.yml || sed -i "s|http://10.0.0.141:3002|${API_BASE}|g" docker-compose.yml

# Pull images
echo "🐳 Pulling Docker images..."
sudo docker compose pull

# Start containers
echo "▶️  Starting Unifarr..."
sudo docker compose up -d

echo ""
echo "✅ Installation complete!"
echo ""
echo "🌐 Frontend: http://10.0.0.141:3000"
echo "🔧 Backend:  http://10.0.0.141:3002"
echo ""
echo "📊 View logs: cd ${INSTALL_DIR} && sudo docker compose logs -f"
echo "🔄 Update:    cd ${INSTALL_DIR} && sudo docker compose pull && sudo docker compose up -d"
