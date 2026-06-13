#!/usr/bin/env bash
# Redeploy the latest from GitHub. Run as root: bash /opt/gallery/deploy/update.sh
# The SQLite DB and uploaded images in server/var/ are left untouched, so the
# gallery's content and admin account persist.
set -euo pipefail
cd /opt/gallery
sudo -u gallery git pull --ff-only
sudo -u gallery pnpm install --frozen-lockfile
sudo -u gallery pnpm build
systemctl restart gallery
systemctl --no-pager status gallery | head -5
