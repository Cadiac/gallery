# Deploying gallery

The app runs as a systemd service bound to `127.0.0.1:3001`, behind nginx (TLS via
certbot) at **https://gallery.cadi.ac**. The SQLite DB and uploaded images live in
`server/var/` (gitignored) and survive redeploys. The schema and the single admin
account auto-create on boot. No Docker; the only native dependency is `sharp`,
which installs a prebuilt binary on Debian x64 (no compiler needed).

The app binds to `127.0.0.1:3001` (nginx is the only public listener), so it can
share a host with other apps as long as that port is free.

## One-time setup (run as root on the server)

```sh
# 1. Node 24 + pnpm (via corepack) — skip any that are already installed
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

## Blocking AI crawlers

`web/public/robots.txt` asks the major LLM/dataset crawlers (GPTBot, ClaudeBot,
Google-Extended, PerplexityBot, CCBot, …) not to crawl the site. That's advisory
— polite bots obey it, but it doesn't *stop* anyone. For hard enforcement, nginx
returns `403` to those user-agents via a shared snippet
(`deploy/block-ai-bots.conf`), included from each site's serving block:

```sh
# Install the snippet once for the whole server…
cp deploy/block-ai-bots.conf /etc/nginx/snippets/

# …then add this line inside the :443 server block of each vhost:
#   include snippets/block-ai-bots.conf;

nginx -t && systemctl reload nginx
```

On this server it's already included from all three sites (gallery, pastels,
lumispheres). Update the list of blocked bots in one place — the snippet — and
reload. Note: certbot manages the live vhosts, so the `include` lines were added
to the deployed `/etc/nginx/sites-available/*` files directly, not via this repo.

## Handy

```sh
systemctl status gallery
journalctl -u gallery -f
```
