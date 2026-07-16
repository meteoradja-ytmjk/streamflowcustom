# 🚀 Deployment Guide - StreamFlow

Panduan lengkap untuk deploy StreamFlow ke production environment.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [VPS Deployment](#vps-deployment)
- [Docker Deployment](#docker-deployment)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [SSL Certificate](#ssl-certificate)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Server Requirements
- Ubuntu 20.04 LTS atau lebih baru
- Minimal 2GB RAM (4GB recommended)
- 2 Core CPU
- 20GB Storage
- Port 80, 443, dan 7575 terbuka

### Software Requirements
- Node.js v18+
- FFmpeg
- PM2 (Process Manager)
- Nginx (untuk reverse proxy)
- Certbot (untuk SSL)

---

## VPS Deployment

### 1. Persiapan Server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt install ffmpeg -y

# Install Git
sudo apt install git -y

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### 2. Clone dan Setup Aplikasi

```bash
# Clone repository
cd /var/www/
sudo git clone https://github.com/meteoradja-ytmjk/streamflowcustom.git
cd streamflowcustom

# Set permissions
sudo chown -R $USER:$USER /var/www/streamflowcustom

# Install dependencies
npm install --legacy-peer-deps

# Generate session secret
node generate-secret.js

# Edit .env file
nano .env
```

**Konfigurasi `.env` untuk production:**

```env
PORT=7575
SESSION_SECRET=your-generated-secret-here
NODE_ENV=production
```

### 3. Setup PM2

```bash
# Start aplikasi dengan PM2
pm2 start app.js --name streamflow

# Auto-start on server reboot
pm2 startup
pm2 save

# Monitor aplikasi
pm2 monit
```

### 4. Firewall Configuration

```bash
# Pastikan SSH terbuka terlebih dahulu!
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 7575

# Enable firewall
sudo ufw enable

# Cek status
sudo ufw status
```

---

## Docker Deployment

### 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Deploy dengan Docker Compose

```bash
# Clone repository
git clone https://github.com/meteoradja-ytmjk/streamflowcustom.git
cd streamflowcustom

# Create .env file
cp .env.example .env
nano .env

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

## Reverse Proxy Setup

### Nginx Configuration

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/streamflow
```

**Basic Configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings untuk streaming
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

**Enable site:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/streamflow /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## SSL Certificate

### Install SSL dengan Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

**Updated Nginx Config dengan SSL:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

Update `.env` untuk HTTPS:

```env
NODE_ENV=production
```

Restart services:

```bash
sudo systemctl restart nginx
pm2 restart streamflow
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View application status
pm2 status

# View logs
pm2 logs streamflow

# Real-time monitoring
pm2 monit

# Restart aplikasi
pm2 restart streamflow

# Stop aplikasi
pm2 stop streamflow
```

### Server Monitoring

```bash
# Check disk usage
df -h

# Check memory usage
free -m

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

### Backup Database

```bash
# Create backup script
nano ~/backup-streamflow.sh
```

**Backup Script:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/streamflow"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/streamflowcustom"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $APP_DIR/db/streamflow.db $BACKUP_DIR/streamflow_${DATE}.db
cp $APP_DIR/db/sessions.db $BACKUP_DIR/sessions_${DATE}.db

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Setup cron untuk backup otomatis:**

```bash
# Make script executable
chmod +x ~/backup-streamflow.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add line:
```
0 2 * * * /home/username/backup-streamflow.sh >> /home/username/backup.log 2>&1
```

### Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/streamflow
```

**Config:**

```
/var/www/streamflowcustom/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Update Aplikasi

```bash
# Navigate to app directory
cd /var/www/streamflowcustom

# Backup database terlebih dahulu
cp db/streamflow.db db/streamflow.db.backup

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --legacy-peer-deps

# Restart aplikasi
pm2 restart streamflow

# Check logs
pm2 logs streamflow --lines 50
```

---

## Troubleshooting Production

### Aplikasi tidak bisa diakses

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs streamflow --err

# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### High CPU Usage

```bash
# Check process
top -p $(pgrep -f streamflow)

# Restart aplikasi
pm2 restart streamflow
```

### Database Locked

```bash
# Stop aplikasi
pm2 stop streamflow

# Check file permissions
ls -la db/

# Fix permissions
chmod 644 db/*.db

# Start aplikasi
pm2 start streamflow
```

### Out of Memory

```bash
# Check memory
free -m

# Increase PM2 max memory
pm2 delete streamflow
pm2 start app.js --name streamflow --max-memory-restart 1G
pm2 save
```

---

## 📞 Support

Jika mengalami masalah saat deployment:

1. Check [GitHub Issues](https://github.com/meteoradja-ytmjk/streamflowcustom/issues)
2. View logs: `pm2 logs streamflow`
3. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

---

**Happy Streaming! 🎬**
