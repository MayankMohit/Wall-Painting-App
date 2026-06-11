#!/usr/bin/env bash
set -e

# 1. System update
sudo apt update && sudo apt upgrade -y

# 2. Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # or logout + login

# 3. Install Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# 4. Open Oracle VM iptables rules (required — OCI VMs block ports by default)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save

# 5. Clone repo
git clone https://github.com/MayankMohit/Wall-Painting-App.git ~/wall-painting-app
cd ~/wall-painting-app

# 6. Create .env.production (fill in all values before continuing)
cp .env.production.example .env.production
nano .env.production

# 7. First build + start (source .env.production so NEXT_PUBLIC_* vars are available as build args)
set -a && source .env.production && set +a
docker compose build
docker compose up -d

# 8. Configure Nginx
sudo cp nginx/wall-app.conf /etc/nginx/sites-available/wall-app
sudo ln -s /etc/nginx/sites-available/wall-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 9. Obtain Let's Encrypt cert (DNS A record must point to this VM's IP first)
sudo certbot --nginx -d wallo.cc -d www.wallo.cc

# 10. Verify auto-renewal timer
sudo systemctl status certbot.timer
