#!/bin/bash

# TrackWise EC2 Setup Script
# This script sets up Docker and prepares the EC2 instance for deployment

set -e

echo "🚀 Setting up TrackWise on EC2 Instance..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    fail2ban \
    ufw \
    certbot \
    python3-certbot-nginx

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/trackwise
sudo chown -R $USER:$USER /opt/trackwise

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Configure fail2ban
echo "🛡️ Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create swap file (if needed for small instances)
echo "💾 Creating swap file..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Install monitoring tools
echo "📊 Installing monitoring tools..."
sudo apt install -y htop iotop nethogs

# Create docker daemon configuration
echo "⚙️ Configuring Docker daemon..."
sudo mkdir -p /etc/docker
cat <<EOF | sudo tee /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# Restart Docker with new configuration
sudo systemctl restart docker

# Create application user
echo "👤 Creating application user..."
if ! id "trackwise" &>/dev/null; then
    sudo useradd -m -s /bin/bash trackwise
    sudo usermod -aG docker trackwise
fi

# Create directory structure
echo "📂 Creating directory structure..."
sudo -u trackwise mkdir -p /opt/trackwise/{logs,uploads,backups,ssl}

# Set up log rotation
echo "🗂️ Setting up log rotation..."
cat <<EOF | sudo tee /etc/logrotate.d/trackwise
/opt/trackwise/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 trackwise trackwise
}
EOF

# Install AWS CLI (optional, for backups)
echo "☁️ Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

# Create backup script
echo "💾 Creating backup script..."
cat <<'EOF' > /opt/trackwise/backup.sh
#!/bin/bash
# TrackWise Backup Script

BACKUP_DIR="/opt/trackwise/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="trackwise_backup_$TIMESTAMP"

echo "🔄 Starting backup: $BACKUP_NAME"

# Stop containers
cd /opt/trackwise
docker-compose -f docker-compose.prod.yml stop

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup database
docker run --rm \
    --network trackwise_trackwise_network \
    -v "$BACKUP_DIR/$BACKUP_NAME":/backup \
    postgres:15-alpine \
    pg_dump -h trackwise_postgres -U trackwise -d trackwise -f /backup/database.sql

# Backup uploads and logs
cp -r uploads "$BACKUP_DIR/$BACKUP_NAME/"
cp -r logs "$BACKUP_DIR/$BACKUP_NAME/"

# Create tar archive
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Keep only last 7 backups
ls -t *.tar.gz | tail -n +8 | xargs -r rm

# Start containers
cd /opt/trackwise
docker-compose -f docker-compose.prod.yml start

echo "✅ Backup completed: ${BACKUP_NAME}.tar.gz"
EOF

chmod +x /opt/trackwise/backup.sh
sudo chown trackwise:trackwise /opt/trackwise/backup.sh

# Add backup to cron (daily at 2 AM)
echo "⏰ Setting up automated backups..."
sudo -u trackwise crontab -l 2>/dev/null | { cat; echo "0 2 * * * /opt/trackwise/backup.sh"; } | sudo -u trackwise crontab -

# Create health check script
echo "🏥 Creating health check script..."
cat <<'EOF' > /opt/trackwise/health-check.sh
#!/bin/bash
# TrackWise Health Check Script

cd /opt/trackwise

echo "🔍 TrackWise Health Check - $(date)"
echo "=================================="

# Check container status
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n💾 Disk Usage:"
df -h /opt/trackwise

echo -e "\n🐳 Docker System:"
docker system df

echo -e "\n📈 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Test endpoints
echo -e "\n🌐 Endpoint Tests:"
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost/health || echo "Frontend: Failed"
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost/api/docs || echo "Backend: Failed"
EOF

chmod +x /opt/trackwise/health-check.sh
sudo chown trackwise:trackwise /opt/trackwise/health-check.sh

echo "✅ EC2 setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Reboot the instance to ensure all changes take effect"
echo "2. Clone your repository to /opt/trackwise/"
echo "3. Create environment file (.env.prod)"
echo "4. Run the deployment script"
echo ""
echo "🔄 To reboot: sudo reboot"