# Deploying gallery

The app runs as a systemd service bound to `127.0.0.1:3001`, behind nginx (TLS via
certbot) at **https://gallery.cadi.ac**. The SQLite DB and uploaded images live in
`server/var/` (gitignored) and survive redeploys. The schema and the single admin
account auto-create on boot. No Docker; the only native dependency is `sharp`,
which installs a prebuilt binary on Debian x64 (no compiler needed).

This shares a host with the pastels app — note the **different port (3001)** and
service/user names.

## One-time setup (run as root on the server)

```sh
# 1. Node 24 + pnpm (via corepack) — already present if pastels is installed
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
corepack enable

# 2. Service user + clone (public repo, HTTPS)
useradd --system --create-home --shell /bin/bash gallery
mkdir -p /opt/gallery && chown gallery:gallery /opt/gallery
sudo -u gallery git clone https://github.com/Cadiac/gallery.git /opt/gallery

# 3. Install + build (corepack fetches pnpm from package.json "packageManager";
#    sharp pulls its prebuilt linux-x64 binary)
cd /opt/gallery
sudo -u gallery pnpm install --frozen-lockfile
sudo -u gallery pnpm build

# 4. Environment (choose a strong admin password — this is your only login)
cat >/etc/gallery.env <<'EOF'
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
COOKIE_SECURE=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-to-something-strong
NODE_OPTIONS=--disable-warning=ExperimentalWarning
EOF
chmod 600 /etc/gallery.env

# 5. systemd service
cp deploy/gallery.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now gallery
curl -s localhost:3001/api/artworks   # -> [] = up (empty gallery)

# 6. DNS: point gallery.cadi.ac at this server, then:

# 7. nginx site
cp deploy/nginx-gallery.conf /etc/nginx/sites-available/gallery.cadi.ac
ln -s ../sites-available/gallery.cadi.ac /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. TLS (adds :443 + http->https redirect; renewal already automated)
certbot --nginx -d gallery.cadi.ac
```

Then open https://gallery.cadi.ac/login and sign in with the admin credentials
from `/etc/gallery.env`. To change the password later, edit that file and
`systemctl restart gallery` (the hash is refreshed on boot).

## Redeploy

```sh
bash /opt/gallery/deploy/update.sh   # as root: pull, install, build, restart
```

## Handy

```sh
systemctl status gallery
journalctl -u gallery -f
```
