# Crayon Box School — Production Deployment Guide

This guide details how to deploy the Crayon Box School website and administrative platform to production with SSL, persistence, and maximum performance.

---

## 1. System Requirements

* **Runtime**: Node.js v20.0.0+ (Tested on Node.js v22 and v26 native)
* **Dependencies**: **0 external npm packages required**. The platform uses native `node:http`, `node:sqlite`, `node:crypto`, `node:zlib`, and `node:fs`.
* **Hardware**: Minimal footprint (runs effortlessly on a $4–$5/mo VPS or free container tier).

---

## 2. Deployment Methods

### Option A: Standard Node.js VPS / Systemd (Recommended)

1. **Clone or transfer project files to your server**:
   ```bash
   cd /var/www/crayon-box-school
   ```

2. **Test run**:
   ```bash
   node server.js
   ```

3. **Configure Systemd Service** (`/etc/systemd/system/crayonbox.service`):
   ```ini
   [Unit]
   Description=Crayon Box School Production Engine
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/crayon-box-school
   ExecStart=/usr/bin/node server.js
   Restart=on-failure
   Environment=NODE_ENV=production PORT=3000 HOST=127.0.0.1

   [Install]
   WantedBy=multi-user.target
   ```

4. **Enable & Start**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable crayonbox
   sudo systemctl start crayonbox
   sudo systemctl status crayonbox
   ```

---

### Option B: Docker / Container Deployment

1. **Run with Docker Compose** (automatically mounts persistent volumes for database, resumes, and backups):
   ```bash
   docker compose up -d --build
   ```

2. **Verify container health**:
   ```bash
   docker ps
   docker logs -f crayon_box_school_app
   ```

---

### Option C: Cloud PaaS (Render, Railway, Fly.io)

1. Set **Build Command**: `None` (or `npm run build` if required by provider)
2. Set **Start Command**: `node server.js`
3. Set **Port**: `3000` (or leave default `$PORT`)
4. Attach a persistent disk to preserve:
   - `/app/school.db` (Inquiries database)
   - `/app/uploads` (Teacher resumes & image uploads)
   - `/app/backups` (Automated visual editor page backups)

---

## 3. Nginx Reverse Proxy with Free SSL (HTTPS)

Create `/etc/nginx/sites-available/crayonboxschool.edu.in`:

```nginx
server {
    server_name crayonboxschool.edu.in www.crayonboxschool.edu.in;

    # Client body limit for candidate resume uploads
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site & obtain SSL certificate with Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/crayonboxschool.edu.in /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crayonboxschool.edu.in -d www.crayonboxschool.edu.in
```

---

## 4. Production Security & Data Safeguards

* **Admin Authentication**:
  * Default URL: `/admin.html`
  * Credentials: `admin` / `cbs2026admin`
  * Passwords are encrypted with `crypto.scryptSync` (16-byte cryptographic salt). Sessions use secure HttpOnly cookies (`cbs_admin_session`).
* **Automated Rollback Backups**:
  * Any edit made via the In-Browser Visual Editor automatically creates a backup file in `backups/pages/<page>.<timestamp>.bak.html` prior to disk writing.
* **Routine Database Backup**:
  * A simple cron job copying `school.db` once daily provides instant point-in-time recovery:
    ```bash
    0 2 * * * cp /var/www/crayon-box-school/school.db /var/backups/school_$(date +\%F).db
    ```
