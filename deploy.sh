#!/bin/bash
# CheckDebt.app Deployment Script for Tencent Lighthouse (Ubuntu)
# Run this on the server after cloning the repo

set -e

echo "=== CheckDebt.app Deployment ==="

# 1. Install Node.js 20
echo ">>> Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PostgreSQL
echo ">>> Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Create database
echo ">>> Setting up database..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'CheckDebt2026!';"
sudo -u postgres psql -c "CREATE DATABASE lender_system;" 2>/dev/null || echo "Database already exists"

# 4. Install dependencies
echo ">>> Installing dependencies..."
cd /opt/checkdebt-app
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 5. Setup environment
echo ">>> Setting up environment..."
cat > server/.env << 'ENVFILE'
DATABASE_URL="postgresql://postgres:CheckDebt2026!@localhost:5432/lender_system?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
PORT=3001
UPLOAD_DIR="./uploads"
ENVFILE

# 6. Run migrations
echo ">>> Running database migrations..."
cd server
npx prisma migrate deploy --schema=../prisma/schema.prisma
npx prisma generate --schema=../prisma/schema.prisma

# 7. Seed database
echo ">>> Seeding database..."
node src/seed.js

# 8. Build frontend
echo ">>> Building frontend..."
cd ../client
npm run build

# 9. Setup PM2 process manager
echo ">>> Setting up PM2..."
sudo npm install -g pm2
cd ../server
pm2 delete checkdebt 2>/dev/null || true
pm2 start src/index.js --name checkdebt
pm2 save
pm2 startup

# 10. Setup Nginx
echo ">>> Setting up Nginx..."
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/checkdebt << 'NGINX'
server {
    listen 80;
    server_name checkdebt.app www.checkdebt.app;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/checkdebt /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 11. SSL with Let's Encrypt
echo ">>> Setting up SSL..."
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d checkdebt.app -d www.checkdebt.app --non-interactive --agree-tos --email sunkkw@gmail.com || echo "SSL setup may need manual DNS verification"

echo ""
echo "=== Deployment Complete ==="
echo "App: http://YOUR_SERVER_IP:3001"
echo "With Nginx: http://checkdebt.app"
echo ""
echo "Login credentials:"
echo "  Lender: admin@quickfund.com / admin123"
echo "  Admin:  admin@checkdebt.app / superadmin"
