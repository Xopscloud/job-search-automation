#!/usr/bin/env bash
# ==============================================================================
# AWS EC2 AUTOMATED SETUP SCRIPT FOR N8N JOB SEARCH AUTOMATION STACK
# Targets: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🚀 Starting Automated Setup of n8n Job Search Stack on EC2"
echo "=========================================================="

# 1. Update and install basic tools
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw htop jq

# 2. Configure 2GB Swap Memory (Crucial for t2.micro / t3.micro to prevent OOM)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB swap file for instance stability..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap memory enabled."
else
    echo "ℹ️ Swap file already exists."
fi

# 3. Install Docker Engine & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable non-root docker usage for current user
    sudo usermod -aG docker "$USER"
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "✅ Docker installed successfully."
else
    echo "ℹ️ Docker already installed."
fi

# 4. Configure UFW Firewall
echo "🛡️ Configuring Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP (Caddy SSL)'
sudo ufw allow 443/tcp comment 'HTTPS (Caddy SSL)'
echo "y" | sudo ufw enable || true
echo "✅ Firewall active on ports 22, 80, 443."

# 5. Environment configuration
STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$STACK_DIR"

if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  PLEASE EDIT .env TO FILL IN YOUR API KEYS AND EMAIL CREDENTIALS!"
fi

# 6. Build and Start Stack
echo "🏗️ Building and starting Docker containers..."
sudo docker compose build --no-cache scraper-service
sudo docker compose up -d

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================================="
PUBLIC_IP=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org || echo "YOUR-EC2-PUBLIC-IP")
echo "🌐 Access n8n at: http://${PUBLIC_IP}:5678 or your configured domain"
echo "🔍 View container status: sudo docker compose ps"
echo "📜 View live logs: sudo docker compose logs -f"
echo ""
echo "Next Steps:"
echo "1. Edit .env with your credentials: nano .env"
echo "2. Restart containers if .env changed: sudo docker compose up -d"
echo "3. Log into n8n web UI, create your admin account, and import workflows/master_job_search_workflow.json"
echo "=========================================================="
