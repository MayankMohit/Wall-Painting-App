# Deployment Plan — Wall Painting App on Oracle Cloud ARM64

## Context

Full-stack Next.js 16 app with two BullMQ workers, local Redis, MongoDB Atlas, and multiple
external services (Cloudinary, R2, Firebase FCM, Resend). Deploying to Oracle Cloud Free Tier
ARM64 VM. No Docker or CI/CD config exists yet. PM2 `ecosystem.config.js` exists but is
superseded by Docker Compose.

**Confirmed decisions:**
- Build Docker images **on the Oracle VM** (native ARM64, no QEMU, no registry push needed)
- `www.wallo.cc` redirects to `wallo.cc`

---

## Target Architecture

```
Internet
  │
  ├─ :80  ──→ Nginx (native on VM) ──redirect──→ https://wallo.cc
  └─ :443 ──→ Nginx (Let's Encrypt TLS) ──proxy──→ 127.0.0.1:3000
                                                         │
                                               ┌─────────┼──────────┐
                                               │         │          │
                                          app:3000   worker    redis:6379
                                         (Docker)  (Docker)   (Docker)
                                               └─────────────────────┘
                                                   docker bridge net
```

External services (unchanged): MongoDB Atlas, Cloudinary, Cloudflare R2, Firebase FCM, Resend

---

## Files to Create / Modify

### 1. `next.config.ts` — Add `output: 'standalone'`

Add one line inside `nextConfig`:

```typescript
output: 'standalone',
```

This makes Next.js emit a self-contained minimal server in `.next/standalone/` — required for
efficient Docker images. Without it the image would need all of `node_modules/` copied in.

---

### 2. `Dockerfile` — Multi-stage ARM64-compatible build

```dockerfile
# Stage 1: Install production dependencies only
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Full install + build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install without prebuilt binaries so sharp compiles natively on ARM64
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Minimal production image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone server (no node_modules needed for the web server itself)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Workers and their dependencies
COPY --from=builder /app/workers ./workers
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "server.js"]
```

The `worker` service in docker-compose.yml uses the same image with a different `command`.

---

### 3. `.dockerignore`

```
.next/
node_modules/
.env*
*.log
.git/
.github/
docs/
```

---

### 4. `docker-compose.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - app_net

  app:
    build: .
    restart: always
    ports:
      - "127.0.0.1:3000:3000"   # bound to localhost only; Nginx proxies from outside
    env_file: .env.production
    depends_on:
      - redis
    networks:
      - app_net

  worker:
    build: .
    restart: always
    command: ["node", "node_modules/.bin/tsx", "workers/index.ts"]
    env_file: .env.production
    depends_on:
      - redis
    networks:
      - app_net

volumes:
  redis_data:

networks:
  app_net:
    driver: bridge
```

> Port `3000` is bound to `127.0.0.1` only — never directly exposed to the internet.

---

### 5. `.env.production` (lives on VM only — never committed to git)

Copy your current `.env` to the VM as `.env.production` and change these values:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://wallo.cc
REDIS_URL=redis://redis:6379        # 'redis' = Docker service name on the bridge network
LOG_LEVEL=warn
# All other vars remain the same (MongoDB URI, Cloudinary, R2, Firebase, Resend...)
```

Add `.env.production` to `.gitignore`.

---

### 6. `nginx/wall-app.conf`

Copy to `/etc/nginx/sites-available/wall-app` on the VM.

```nginx
# HTTP → HTTPS redirect for both apex and www
server {
    listen 80;
    listen [::]:80;
    server_name wallo.cc www.wallo.cc;
    return 301 https://wallo.cc$request_uri;
}

# www HTTPS → apex redirect
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.wallo.cc;
    ssl_certificate     /etc/letsencrypt/live/wallo.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wallo.cc/privkey.pem;
    return 301 https://wallo.cc$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name wallo.cc;

    ssl_certificate     /etc/letsencrypt/live/wallo.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wallo.cc/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    location / {
        proxy_pass          http://127.0.0.1:3000;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade $http_upgrade;
        proxy_set_header    Connection 'upgrade';
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
        proxy_read_timeout  60s;
    }
}
```

---

### 7. `.github/workflows/deploy.yml` — GitHub Actions CI/CD

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Oracle VM
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.ORACLE_HOST }}
          username: ${{ secrets.ORACLE_USER }}
          key:      ${{ secrets.ORACLE_SSH_KEY }}
          script: |
            set -e
            cd ~/wall-painting-app
            git pull origin main
            docker compose build --no-cache
            docker compose up -d --no-deps --build app worker
            sleep 5
            curl -sf http://127.0.0.1:3000/api/health || exit 1
            echo "Deploy successful"
```

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `ORACLE_HOST` | VM public IP address |
| `ORACLE_USER` | `ubuntu` (default Oracle Ubuntu user) |
| `ORACLE_SSH_KEY` | Private SSH key (the one paired with VM's authorized key) |

---

### 8. `scripts/setup-vm.sh` — One-time VM bootstrap

Run this manually on the Oracle VM the first time only.

```bash
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
git clone https://github.com/<your-org>/wall-painting-app.git ~/wall-painting-app
cd ~/wall-painting-app

# 6. Create .env.production (fill in all values before continuing)
cp .env .env.production
# Edit: REDIS_URL=redis://redis:6379, NEXT_PUBLIC_APP_URL=https://wallo.cc, NODE_ENV=production
nano .env.production

# 7. First build + start
docker compose build
docker compose up -d

# 8. Configure Nginx
sudo cp nginx/wall-app.conf /etc/nginx/sites-available/wall-app
sudo ln -s /etc/nginx/sites-available/wall-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 9. Obtain Let's Encrypt cert (DNS A record must point to this IP first)
sudo certbot --nginx -d wallo.cc -d www.wallo.cc

# 10. Verify auto-renewal timer
sudo systemctl status certbot.timer
```

---

## Oracle Cloud Security List

In the OCI Console → VCN → Security List, add these **ingress rules**:

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 22 | Your IP only | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP (redirect + Let's Encrypt validation) |
| TCP | 443 | 0.0.0.0/0 | HTTPS |

---

## ARM64 Notes

| Component | ARM64 status |
|-----------|-------------|
| `node:22-alpine` | Official multi-arch — native ARM64 |
| `redis:7-alpine` | Official multi-arch — native ARM64 |
| `sharp` v0.34.5 | Installed without prebuilt scripts → compiles natively in Docker build |
| Build process | Runs on-VM — no QEMU, no cross-compilation |

---

## Deployment Flow (after initial setup)

```
git push origin main
  → GitHub Actions triggers (ubuntu-latest runner)
  → SSH into Oracle VM
  → git pull → docker compose build (native ARM64 on VM)
  → docker compose up -d --no-deps app worker (rolling restart)
  → curl /api/health verifies MongoDB + Redis
  → Done (~2–4 min)
```

---

## Verification Checklist

- [ ] `curl https://wallo.cc/api/health` → `{"status":"ok",...}`
- [ ] `docker compose ps` → all 3 services show `Up`
- [ ] `docker compose logs worker` → workers connected and polling queues
- [ ] HTTPS padlock in browser, cert from Let's Encrypt
- [ ] `curl -I http://wallo.cc` → `301 → https://wallo.cc`
- [ ] `curl -I https://www.wallo.cc` → `301 → https://wallo.cc`
- [ ] Login, file generation job, and push notification work end-to-end

---

## Notes

- Replace every instance of `wallo.cc` with your actual domain before running anything
- `.env.production` is created manually on the VM — add it to `.gitignore`
- The existing `ecosystem.config.js` (PM2) is superseded by Docker Compose — can be removed
- `assetCleanup` queue is defined in `src/lib/queues.ts` but has no worker — pre-existing, not in scope
- Pre-existing queue name mismatch (`fileGen` vs `fileGenQueue`) is not in scope for this deployment
