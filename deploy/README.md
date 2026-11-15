# Auto-update on the VPS

Install once (as root):

```
cd /opt/uno && git pull
git config --global --add safe.directory /opt/uno
install -m 755 /opt/uno/deploy/autopull.sh /usr/local/bin/uno-autopull
cat > /etc/systemd/system/uno-autopull.service <<'X'
[Unit]
Description=LAST DEAL auto-update
[Service]
Type=oneshot
ExecStart=/usr/local/bin/uno-autopull
X
cat > /etc/systemd/system/uno-autopull.timer <<'X'
[Unit]
Description=LAST DEAL auto-update every minute
[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
X
systemctl daemon-reload && systemctl enable --now uno-autopull.timer
```

Every minute it checks GitHub. A new commit is applied only when nobody is connected
(after 3 hours of waiting it applies anyway). Log: `journalctl -t uno-autopull -n 20`.
Turn off: `systemctl disable --now uno-autopull.timer`.
