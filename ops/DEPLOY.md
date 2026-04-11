# VPS Deploy

This project is intended to run on a single VPS with:

- PostgreSQL
- PM2
- nginx
- Postfix for outbound mail

## 1. Install packages

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx postfix opendkim opendkim-tools
```

Install Node.js 20+ and PM2 separately.

## 2. Create database

```bash
sudo -u postgres psql
```

```sql
create user gympulse_app with password 'replace-this-password';
create database gympulse owner gympulse_app;
\q
```

Apply the schema:

```bash
psql "postgres://gympulse_app:replace-this-password@127.0.0.1:5432/gympulse" -f db/init.sql
```

## 3. Configure environment

```bash
cp .env.example .env.local
chmod +x scripts/*.sh
```

Required production values:

```bash
DATABASE_URL=postgres://gympulse_app:replace-this-password@127.0.0.1:5432/gympulse
APP_URL=https://gympulse.space
SESSION_COOKIE_NAME=gympulse_session
SESSION_SECRET=replace-with-a-long-random-secret
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_FROM=noreply@gympulse.space
```

## 4. Build and start

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

For updates, use:

```bash
./scripts/deploy.sh
```

## 5. nginx

Use the template in [`ops/nginx/gympulse.space.conf`](./nginx/gympulse.space.conf).

```bash
sudo cp ops/nginx/gympulse.space.conf /etc/nginx/sites-available/gympulse.space
sudo ln -sf /etc/nginx/sites-available/gympulse.space /etc/nginx/sites-enabled/gympulse.space
sudo nginx -t
sudo systemctl reload nginx
```

Then issue TLS:

```bash
sudo certbot --nginx -d gympulse.space -d www.gympulse.space
```

## 6. Smoke checks

Local:

```bash
curl -I http://127.0.0.1:3000/login
curl -fsS http://127.0.0.1:3000/api/health
```

External:

```bash
./scripts/smoke-test.sh https://gympulse.space
```

## 7. Backups

Manual:

```bash
DATABASE_URL=postgres://... ./scripts/backup-postgres.sh
```

Example cron:

```bash
0 3 * * * cd /var/www/GymWebApp && DATABASE_URL=postgres://... BACKUP_DIR=/var/backups/gympulse ./scripts/backup-postgres.sh
```

Or install the provided `systemd` units from [`ops/systemd`](./systemd):

```bash
sudo cp ops/systemd/gympulse-backup.service /etc/systemd/system/
sudo cp ops/systemd/gympulse-backup.timer /etc/systemd/system/
sudo cp ops/systemd/gympulse-doctor.service /etc/systemd/system/
sudo cp ops/systemd/gympulse-doctor.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gympulse-backup.timer
sudo systemctl enable --now gympulse-doctor.timer
```

Inspect logs with:

```bash
journalctl -u gympulse-backup.service -n 100 --no-pager
journalctl -u gympulse-doctor.service -n 100 --no-pager
```

## 8. Mail setup

See [`ops/MAIL.md`](./MAIL.md) for SPF, DKIM, DMARC, reverse DNS, and Postfix/OpenDKIM notes.
