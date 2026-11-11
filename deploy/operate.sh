#!/bin/sh
set -eu
cd /opt/ruleloop/current
compose() { docker compose --env-file /opt/ruleloop/shared/images.env -f deploy/compose.yml "$@"; }
case "${1:-}" in
  status) compose ps ;;
  restart) compose restart web; compose up -d --no-deps --wait --wait-timeout 120 web ;;
  backup)
    umask 077
    mkdir -p /var/backups/ruleloop
    temporary=$(mktemp /var/backups/ruleloop/.backup-XXXXXX)
    trap 'rm -f "$temporary"' EXIT HUP INT TERM
    compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$temporary"
    test -s "$temporary"
    compose exec -T db pg_restore --list < "$temporary" > /dev/null
    mv "$temporary" "/var/backups/ruleloop/ruleloop-$(date -u +%Y%m%dT%H%M%SZ).dump"
    find /var/backups/ruleloop -name 'ruleloop-*.dump' -type f -mtime +7 -delete
    ;;
  renew)
    . /opt/ruleloop/shared/images.env
    docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt "$CERTBOT_IMAGE" renew --quiet
    nginx -t
    systemctl reload nginx
    ;;
  *) echo 'Usage: operate.sh status|restart|backup|renew' >&2; exit 1 ;;
esac
