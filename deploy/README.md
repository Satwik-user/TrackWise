# TrackWise AWS EC2 Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying TrackWise Railway Management System on AWS EC2 using Docker containers.

## Prerequisites
- AWS Account with EC2 access
- EC2 instance (recommended: t3.medium or larger)
- Ubuntu 20.04 LTS or newer
- At least 4GB RAM and 20GB storage
- Domain name (optional, for SSL)

## 📋 Quick Start

### 1. Launch EC2 Instance
1. **Instance Type**: t3.medium (2 vCPU, 4 GB RAM) minimum
2. **AMI**: Ubuntu Server 22.04 LTS
3. **Storage**: 20 GB GP3 (minimum)
4. **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
5. **Key Pair**: Create or use existing key pair

### 2. Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 3. Initial Setup
```bash
# Run the setup script
curl -fsSL https://raw.githubusercontent.com/Satwik-user/TrackWise/prod/deploy/setup-ec2.sh -o setup-ec2.sh
chmod +x setup-ec2.sh
./setup-ec2.sh

# Reboot to apply all changes
sudo reboot
```

### 4. Deploy Application
```bash
# Switch to trackwise user after reboot
sudo -u trackwise -i
cd /opt/trackwise

# Clone repository
git clone -b prod https://github.com/Satwik-user/TrackWise.git current
cd current

# Create production environment file
cp .env.prod.example .env.prod

# Edit environment variables (IMPORTANT!)
nano .env.prod
```

**🚨 IMPORTANT: Update these critical values in .env.prod:**
```bash
POSTGRES_PASSWORD=your_secure_postgres_password
JWT_SECRET_KEY=your_very_secure_jwt_secret_key_min_32_chars
REDIS_PASSWORD=your_secure_redis_password
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

### 5. Deploy
```bash
# Run deployment script
./deploy/deploy.sh
```

## 🔧 Detailed Configuration

### Security Group Rules
| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |

### Environment Variables

#### Critical Variables (Must Change)
```bash
POSTGRES_PASSWORD=          # Strong password for PostgreSQL
JWT_SECRET_KEY=            # 32+ character secret key for JWT tokens
REDIS_PASSWORD=            # Strong password for Redis
CORS_ORIGINS=              # Your domain(s)
```

#### Optional Variables
```bash
GRAFANA_ADMIN_PASSWORD=    # Grafana admin password
AWS_ACCESS_KEY_ID=         # For automated backups
AWS_SECRET_ACCESS_KEY=     # For automated backups
AWS_S3_BACKUP_BUCKET=      # S3 bucket for backups
```

### SSL Certificate (Recommended for Production)

#### Using Let's Encrypt (Free)
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Update nginx configuration for HTTPS
sudo nano /etc/nginx/sites-available/trackwise
```

#### Using Custom Certificate
```bash
# Copy certificates to SSL directory
sudo cp your-cert.pem /opt/trackwise/ssl/cert.pem
sudo cp your-key.pem /opt/trackwise/ssl/key.pem
sudo chown -R trackwise:trackwise /opt/trackwise/ssl/
```

## 🎛️ Management Commands

### Service Management
```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# Restart services
docker-compose -f docker-compose.prod.yml restart [service_name]

# Update application
cd /opt/trackwise/current && ./deploy/deploy.sh

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### System Management
```bash
# System health check
/opt/trackwise/health-check.sh

# Manual backup
/opt/trackwise/backup.sh

# View system resources
htop

# View disk usage
df -h

# View Docker resources
docker system df
```

### Log Management
```bash
# Application logs
tail -f /opt/trackwise/logs/*.log

# Container logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# System logs
journalctl -f -u trackwise
```

## 📊 Monitoring

### Built-in Health Checks
- Frontend: `http://your-domain.com/health`
- Backend: `http://your-domain.com/api/docs`

### Optional Monitoring Stack
Enable monitoring with:
```bash
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

- **Prometheus**: `http://your-domain.com:9090`
- **Grafana**: `http://your-domain.com:3001` (admin/your_password)

## 🔒 Security Best Practices

### 1. Server Security
```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure fail2ban
sudo systemctl status fail2ban

# Monitor auth logs
sudo tail -f /var/log/auth.log
```

### 2. Application Security
- Use strong passwords for all services
- Keep JWT secret key secure and rotate regularly
- Enable HTTPS with valid SSL certificate
- Regular security updates via deployment script
- Monitor logs for suspicious activity

### 3. Database Security
- PostgreSQL runs in isolated Docker network
- Database backups are encrypted
- Use strong database passwords
- Regular database maintenance

## 🔄 Backup and Recovery

### Automated Backups
- Daily backups at 2 AM (configured in cron)
- Backups stored in `/opt/trackwise/backups/`
- Retention: 7 days locally

### Manual Backup
```bash
/opt/trackwise/backup.sh
```

### Restore from Backup
```bash
# Stop services
docker-compose -f docker-compose.prod.yml stop

# Extract backup
cd /opt/trackwise/backups
tar -xzf trackwise_backup_YYYYMMDD_HHMMSS.tar.gz

# Restore database
docker run --rm \
  --network trackwise_trackwise_network \
  -v "$(pwd)/trackwise_backup_YYYYMMDD_HHMMSS":/backup \
  postgres:15-alpine \
  psql -h trackwise_postgres -U trackwise -d trackwise -f /backup/database.sql

# Restore files
cp -r trackwise_backup_YYYYMMDD_HHMMSS/uploads/* uploads/
cp -r trackwise_backup_YYYYMMDD_HHMMSS/logs/* logs/

# Start services
docker-compose -f docker-compose.prod.yml start
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Containers Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check system resources
free -h
df -h

# Restart Docker daemon
sudo systemctl restart docker
```

#### 2. Database Connection Issues
```bash
# Check database container
docker-compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U trackwise -d trackwise -c "SELECT 1;"
```

#### 3. Frontend/Backend Communication Issues
```bash
# Check nginx logs
docker-compose -f docker-compose.prod.yml logs frontend

# Test API endpoints
curl -f http://localhost/api/docs
curl -f http://localhost/health
```

#### 4. High Resource Usage
```bash
# Monitor resources
docker stats

# Clean up Docker
docker system prune -f
docker image prune -f

# Check for memory leaks
docker-compose -f docker-compose.prod.yml restart
```

### Log Locations
- Application logs: `/opt/trackwise/logs/`
- Docker logs: `docker-compose logs [service]`
- System logs: `/var/log/`
- Nginx logs: `docker-compose logs frontend`

## 📞 Support

### Health Check Endpoints
- Application health: `/health`
- API documentation: `/api/docs`
- Database status: Available through backend API

### Performance Monitoring
- System resources: `htop`, `iotop`, `nethogs`
- Docker resources: `docker stats`
- Application metrics: Grafana dashboard (if enabled)

## 📈 Scaling

### Vertical Scaling (Increase Instance Size)
1. Stop application: `docker-compose down`
2. Resize EC2 instance
3. Start application: `docker-compose up -d`

### Horizontal Scaling (Multiple Instances)
1. Set up Application Load Balancer
2. Configure RDS for database
3. Use ElastiCache for Redis
4. Deploy multiple instances behind ALB

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Deploy/Update
./deploy/deploy.sh

# Health check
/opt/trackwise/health-check.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Backup
/opt/trackwise/backup.sh

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### Important Files
- `/opt/trackwise/current/.env.prod` - Environment configuration
- `/opt/trackwise/current/docker-compose.prod.yml` - Docker services
- `/opt/trackwise/backup.sh` - Backup script
- `/opt/trackwise/health-check.sh` - Health monitoring

### Default Ports
- **80**: Frontend (HTTP)
- **443**: Frontend (HTTPS)
- **9090**: Prometheus (monitoring)
- **3001**: Grafana (monitoring)

---

**🎉 Your TrackWise application should now be running successfully on AWS EC2!**