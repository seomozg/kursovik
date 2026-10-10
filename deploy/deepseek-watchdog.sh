#!/usr/bin/env bash
# deepseek-watchdog.sh - keeps api.deepseek.com reachable from this host.
#
# The CloudFront edge resolved for api.deepseek.com is sometimes unreachable
# from this network (degraded/flapping transit). This watchdog probes the
# current /etc/hosts pin; when it dies it discovers a working CloudFront edge
# dynamically (public DNS / DoH / AWS ip-ranges - no hardcoded IPs), requires
# a FAST connect (< 3s) to reject flapping edges, updates /etc/hosts and
# syncs the pin into every running Docker container (best effort).
#
# Usage: deepseek-watchdog.sh
#   FORCE_DEAD=1 deepseek-watchdog.sh   # skip probing current pin (E2E test)
#
# Log: /var/log/deepseek-watchdog.log   State: /var/lib/deepseek-watchdog/state
set -u

HOST="api.deepseek.com"
LOG="/var/log/deepseek-watchdog.log"
STATE="/var/lib/deepseek-watchdog/state"
LOCK="/run/deepseek-watchdog.lock"
CACHE="/var/cache/deepseek-watchdog/ip-ranges.json"
MARKER="deepseek-watchdog"
PROBE_CONN=5          # TCP connect timeout, sec
PROBE_TIME=10         # total probe timeout, sec
MAX_CONNECT=3.0       # reject edges slower than this (flapping/bad transit)
CF_SAMPLE=20          # how many random CloudFront IPs to try after DNS/DoH

mkdir -p /var/lib/deepseek-watchdog /var/cache/deepseek-watchdog

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; }

# Success = any HTTP status (proves TLS+HTTP) AND fast TCP connect.
# The broken edge answers occasionally but always with 7s+ connect time.
probe_ip() {
    local ip="$1" out code tc
    out=$(curl -s -o /dev/null -w '%{http_code} %{time_connect}' \
        --connect-timeout "$PROBE_CONN" -m "$PROBE_TIME" \
        --resolve "$HOST:443:$ip" "https://$HOST/v1/models" 2>/dev/null)
    code=${out%% *}; tc=${out##* }
    [[ "$code" =~ ^[1-5][0-9][0-9]$ ]] || return 1
    awk -v t="$tc" -v m="$MAX_CONNECT" 'BEGIN{exit (t+0 < m) ? 0 : 1}'
}

# First non-comment /etc/hosts line mentioning $HOST -> its IP (the pin).
current_pin() {
    awk -v h="$HOST" '$1 !~ /^#/ {for(i=2;i<=NF;i++) if($i==h){print $1; exit}}' /etc/hosts
}

# Print candidate IPs (DNS, DoH, sampled CloudFront ranges), deduped.
fetch_candidates() {
    local out=""
    out+=$(dig +short +time=3 +tries=1 @1.1.1.1 "$HOST" 2>/dev/null | grep -E '^[0-9.]+$')
    out+=$'\n'$(dig +short +time=3 +tries=1 @8.8.8.8 "$HOST" 2>/dev/null | grep -E '^[0-9.]+$')
    out+=$'\n'$(curl -s -m 5 "https://dns.google/resolve?name=$HOST&type=A" \
        | grep -o '"data":"[0-9.]*"' | cut -d'"' -f4)
    # CloudFront edge pool from the official AWS ip-ranges (cache 24h)
    if [[ ! -s "$CACHE" ]] || [[ -n "$(find "$CACHE" -mmin +1440 2>/dev/null)" ]]; then
        curl -s -m 60 -o "$CACHE.tmp" "https://ip-ranges.amazonaws.com/ip-ranges.json" \
            && mv "$CACHE.tmp" "$CACHE" || rm -f "$CACHE.tmp"
    fi
    if [[ -s "$CACHE" ]]; then
        out+=$'\n'$(python3 - "$CACHE" "$CF_SAMPLE" <<'PY'
import json, random, sys
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
n = int(sys.argv[2])
pref = [p["ip_prefix"] for p in data.get("prefixes", [])
        if p.get("service") == "CLOUDFRONT" and p.get("region") == "GLOBAL"]
random.shuffle(pref)
for p in pref[:n]:
    print(p.rsplit(".", 1)[0] + "." + str(random.randint(1, 254)))
PY
        )
    fi
    printf '%s\n' "$out" | grep -E '^[0-9.]+$' | awk '!seen[$0]++'
}

# Idempotently set the pin in /etc/hosts and in every running container.
# Logs only actual changes. Note: sed delimiter is ',' because the regex
# and the replacement may contain '|' and '#'.
sync_pin() {
    local new="$1" cid desired cur_line
    desired="$new $HOST"
    if grep -qE "^[^#]*[[:space:]]$HOST([[:space:]]|$)" /etc/hosts; then
        sed -i -E "s,^[0-9.]+[[:space:]]+$HOST([[:space:]]|$).*$,$desired # $MARKER," /etc/hosts
    else
        printf '%s # %s\n' "$desired" "$MARKER" >> /etc/hosts
        log "appended pin $new to /etc/hosts"
    fi
    for cid in $(docker ps -q 2>/dev/null | awk '!seen[$0]++'); do
        docker exec "$cid" sh -c 'command -v sed >/dev/null' 2>/dev/null || continue
        cur_line=$(docker exec "$cid" grep -E "^[^#]*[[:space:]]$HOST([[:space:]]|$)" \
            /etc/hosts 2>/dev/null | head -1 | awk '{print $1" "$2}')
        [[ "$cur_line" == "$desired" ]] && continue
        if [[ -n "$cur_line" ]]; then
            # NOTE: container /etc/hosts is a docker bind mount - in-place
            # edits only; sed -i (rename) fails with EBUSY inside containers.
            docker exec -u 0 "$cid" sh -c \
                "sed -E 's,^[0-9.]+[[:space:]]+$HOST.*$,$desired,' /etc/hosts > /tmp/.hosts.dw && cat /tmp/.hosts.dw > /etc/hosts && rm -f /tmp/.hosts.dw" \
                2>/dev/null \
                && log "updated pin $new in container $cid" \
                || log "WARN: failed to update pin in container $cid"
        else
            docker exec -u 0 "$cid" sh -c "echo '$desired' >> /etc/hosts" 2>/dev/null \
                && log "injected pin $new into container $cid" \
                || log "WARN: failed to inject pin into container $cid"
        fi
    done
}

main() {
    exec 9>"$LOCK"; flock -n 9 || exit 0
    local cur ip
    cur="$(current_pin)"
    if [[ "${FORCE_DEAD:-0}" != "1" ]] && [[ -n "$cur" ]] && probe_ip "$cur"; then
        if [[ "$(cat "$STATE" 2>/dev/null)" != "OK $cur" ]]; then
            log "OK pin=$cur alive"
            echo "OK $cur" > "$STATE"
        fi
        sync_pin "$cur"   # re-pin restarted containers (idempotent, logs changes only)
        exit 0
    fi
    log "DEAD pin=${cur:-<none>}; discovering new IP..."
    while read -r ip; do
        [[ -z "$ip" || "$ip" == "$cur" ]] && continue
        if probe_ip "$ip"; then
            sync_pin "$ip"
            log "SWITCH pin=${cur:-<none>} -> $ip"
            echo "OK $ip" > "$STATE"
            exit 0
        fi
    done < <(fetch_candidates)
    log "CRITICAL: no reachable candidate found for $HOST"
    echo "CRITICAL" > "$STATE"
    exit 1
}

main "$@"