#!/bin/bash
# LAST DEAL auto-update: pulls new commits from GitHub and restarts the game,
# but only when nobody is connected (so no match is cut off). If players stay
# connected for more than 3 hours after an update appears, it restarts anyway.
DIR=/opt/uno
# the game's port: taken from the uno service's environment, 3000 if it sets none
PORT=$(systemctl show uno -p Environment --value 2>/dev/null | tr ' ' '\n' | sed -n 's/^PORT=//p' | head -1)
PORT=${PORT:-3000}
STAMP=/var/tmp/uno-autopull.pending

cd "$DIR" || exit 1
git fetch -q origin main 2>/dev/null || exit 0
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then rm -f "$STAMP"; exit 0; fi

[ -f "$STAMP" ] || date +%s > "$STAMP"
WAITED=$(( $(date +%s) - $(cat "$STAMP") ))
BUSY=$(curl -s --max-time 3 "http://127.0.0.1:$PORT/busy" || echo 0)
case "$BUSY" in ''|*[!0-9]*) BUSY=0 ;; esac
if [ "$BUSY" -gt 0 ] && [ "$WAITED" -lt 10800 ]; then
  logger -t uno-autopull "update waiting: $BUSY connected"
  exit 0
fi

git merge -q --ff-only origin/main || { logger -t uno-autopull "merge failed, local changes?"; exit 1; }
chown -R uno:uno "$DIR"
systemctl restart uno
rm -f "$STAMP"
logger -t uno-autopull "updated ${LOCAL:0:7} -> ${REMOTE:0:7}"
