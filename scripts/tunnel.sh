#!/usr/bin/env bash
# tunnel.sh — auto-managed Cloudflare Quick Tunnel untuk Tokopudidi.
# Menjalankan 2 tunnel paralel: Web (Next.js :3000) + API (Express :4000),
# health-check tiap interval, restart otomatis kalau URL mati.
#
# Pakai:
#   ./scripts/tunnel.sh                # default port web=3000 api=4000
#   WEB_PORT=3001 API_PORT=4001 ./scripts/tunnel.sh
#   nohup ./scripts/tunnel.sh > tunnel.out 2>&1 &
#
# URL aktif ditulis ke ./tunnel-urls.json — bisa di-`cat` kapan saja.
# Saat URL berubah (restart), apps/web/.env.local & apps/api/.env juga
# di-update otomatis — TAPI dev server harus di-restart sendiri agar
# load env baru (Next.js: full restart, Express tsx watch: file edit memicu).
#
# Catatan: skrip ini kompatibel dengan bash 3.2 (default macOS) — tidak
# pakai associative array. Kalau perlu tambah role, copy blok role yang ada.
#
# Hentikan dengan Ctrl+C atau `kill <PID>` (cleanup handler akan membunuh
# kedua subprocess cloudflared).

set -u

WEB_PORT="${WEB_PORT:-3000}"
API_PORT="${API_PORT:-4000}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL_FILE="${REPO_ROOT}/tunnel-urls.json"
LOG_FILE="${REPO_ROOT}/tunnel.log"
WEB_ENV_FILE="${REPO_ROOT}/apps/web/.env.local"
API_ENV_FILE="${REPO_ROOT}/apps/api/.env"

CHECK_INTERVAL=30          # detik antar pengecekan kesehatan
FAILURE_THRESHOLD=3        # gagal berturut sebelum restart
CURL_TIMEOUT=10
URL_WAIT_TIMEOUT=30

WEB_HEALTH_PATH="/"
API_HEALTH_PATH="/api/health"

# State per-tunnel (web/api) — variabel eksplisit, bukan assoc array (bash 3.2 friendly).
WEB_PID=""
WEB_URL=""
WEB_FAIL=0
WEB_TMP=""

API_PID=""
API_URL=""
API_FAIL=0
API_TMP=""

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

notify_macos() {
  command -v osascript >/dev/null 2>&1 || return 0
  osascript -e "display notification \"$2\" with title \"$1\"" 2>/dev/null || true
}

write_url_file() {
  cat > "$URL_FILE" <<EOF
{
  "web": "${WEB_URL}",
  "api": "${API_URL}",
  "updatedAt": "$(date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
}

# upsert_env <file> <key> <value> — replace baris key=... atau append.
upsert_env() {
  local file="$1" key="$2" value="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" '
      BEGIN{FS=OFS="="}
      $1==k {print k"="v; next}
      {print}
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

sync_env_files() {
  if [[ -n "$API_URL" ]]; then
    upsert_env "$WEB_ENV_FILE" "NEXT_PUBLIC_API_URL" "$API_URL"
  fi
  if [[ -n "$WEB_URL" ]]; then
    # WEB_ORIGIN: pertahankan localhost:3000 supaya akses lokal tetap jalan.
    upsert_env "$API_ENV_FILE" "WEB_ORIGIN" "${WEB_URL},http://localhost:${WEB_PORT}"
  fi
}

cleanup() {
  log "Cleanup — menghentikan semua tunnel..."
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  [[ -n "$WEB_TMP" ]] && rm -f "$WEB_TMP"
  [[ -n "$API_TMP" ]] && rm -f "$API_TMP"
  rm -f "$URL_FILE"
  log "Selesai."
  exit 0
}
trap cleanup EXIT INT TERM

# start_tunnel_web — start web tunnel; set WEB_PID / WEB_URL / WEB_TMP.
start_tunnel_web() {
  local local_url="http://localhost:${WEB_PORT}"
  WEB_TMP=$(mktemp)
  log "▶️  Memulai tunnel web → ${local_url}"
  cloudflared tunnel --url "$local_url" --no-autoupdate > "$WEB_TMP" 2>&1 &
  WEB_PID=$!

  local url="" i
  for ((i=1; i<=URL_WAIT_TIMEOUT; i++)); do
    sleep 1
    if ! kill -0 "$WEB_PID" 2>/dev/null; then
      log "❌ cloudflared web mati prematur. Tail log:"
      tail -5 "$WEB_TMP" | sed 's/^/    /' | tee -a "$LOG_FILE"
      WEB_PID=""
      return 1
    fi
    url=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$WEB_TMP" 2>/dev/null | head -1)
    [[ -n "$url" ]] && break
  done

  if [[ -z "$url" ]]; then
    log "❌ Timeout ${URL_WAIT_TIMEOUT}s menunggu URL web."
    kill "$WEB_PID" 2>/dev/null || true
    WEB_PID=""
    return 1
  fi

  WEB_URL="$url"
  WEB_FAIL=0
  log "✅ Tunnel web aktif: ${WEB_URL}"
  notify_macos "Tokopudidi" "Tunnel web: ${WEB_URL}"
  sleep 5
  return 0
}

# start_tunnel_api — start api tunnel; set API_PID / API_URL / API_TMP.
start_tunnel_api() {
  local local_url="http://localhost:${API_PORT}"
  API_TMP=$(mktemp)
  log "▶️  Memulai tunnel api → ${local_url}"
  cloudflared tunnel --url "$local_url" --no-autoupdate > "$API_TMP" 2>&1 &
  API_PID=$!

  local url="" i
  for ((i=1; i<=URL_WAIT_TIMEOUT; i++)); do
    sleep 1
    if ! kill -0 "$API_PID" 2>/dev/null; then
      log "❌ cloudflared api mati prematur. Tail log:"
      tail -5 "$API_TMP" | sed 's/^/    /' | tee -a "$LOG_FILE"
      API_PID=""
      return 1
    fi
    url=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$API_TMP" 2>/dev/null | head -1)
    [[ -n "$url" ]] && break
  done

  if [[ -z "$url" ]]; then
    log "❌ Timeout ${URL_WAIT_TIMEOUT}s menunggu URL api."
    kill "$API_PID" 2>/dev/null || true
    API_PID=""
    return 1
  fi

  API_URL="$url"
  API_FAIL=0
  log "✅ Tunnel api aktif: ${API_URL}"
  notify_macos "Tokopudidi" "Tunnel api: ${API_URL}"
  sleep 5
  return 0
}

stop_tunnel_web() {
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
  fi
  WEB_PID=""
  WEB_URL=""
  [[ -n "$WEB_TMP" ]] && rm -f "$WEB_TMP"
  WEB_TMP=""
}

stop_tunnel_api() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  API_PID=""
  API_URL=""
  [[ -n "$API_TMP" ]] && rm -f "$API_TMP"
  API_TMP=""
}

# Return 0 = sehat, 1 = perlu restart, 2 = lokal mati (skip restart).
check_url_alive() {
  local url="$1" port="$2" path="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_TIMEOUT" \
           "${url}${path}" 2>/dev/null)
  if [[ "$code" =~ ^[23][0-9][0-9]$ ]]; then
    return 0
  fi
  if ! curl -s -o /dev/null --max-time 3 "http://localhost:${port}${path}" 2>/dev/null; then
    log "⚠️  HTTP ${code} dari tunnel ${url}; lokal :${port} juga mati. Skip restart."
    return 2
  fi
  log "⚠️  Tunnel ${url} tidak sehat (HTTP ${code})."
  return 1
}

# === Pre-checks ===
command -v cloudflared >/dev/null 2>&1 || {
  log "❌ cloudflared tidak terpasang. Install: brew install cloudflared"
  exit 1
}

if ! curl -s -o /dev/null --max-time 3 "http://localhost:${WEB_PORT}${WEB_HEALTH_PATH}" 2>/dev/null; then
  log "❌ Web lokal http://localhost:${WEB_PORT}${WEB_HEALTH_PATH} tidak merespons. Jalankan: npm run dev"
  exit 1
fi
if ! curl -s -o /dev/null --max-time 3 "http://localhost:${API_PORT}${API_HEALTH_PATH}" 2>/dev/null; then
  log "❌ API lokal http://localhost:${API_PORT}${API_HEALTH_PATH} tidak merespons. Jalankan: npm run dev"
  exit 1
fi

# Bunuh instance cloudflared lama untuk port-port kita (jangan ganggu tunnel lain).
for port in "$WEB_PORT" "$API_PORT"; do
  existing=$(pgrep -f "cloudflared tunnel.*--url http://localhost:${port}" || true)
  if [[ -n "$existing" ]]; then
    log "Menghentikan cloudflared lama untuk :${port} (PID: $(echo "$existing" | tr '\n' ' '))..."
    pkill -f "cloudflared tunnel.*--url http://localhost:${port}" 2>/dev/null || true
    sleep 2
  fi
done

log "Monitor mulai. URL_FILE=${URL_FILE} LOG_FILE=${LOG_FILE}"

# === Main loop ===
while true; do
  changed=0

  if [[ -z "$WEB_PID" ]] || ! kill -0 "$WEB_PID" 2>/dev/null; then
    if start_tunnel_web; then
      changed=1
    else
      log "Coba ulang web dalam 10 detik..."
      sleep 10
      continue
    fi
  fi

  if [[ -z "$API_PID" ]] || ! kill -0 "$API_PID" 2>/dev/null; then
    if start_tunnel_api; then
      changed=1
    else
      log "Coba ulang api dalam 10 detik..."
      sleep 10
      continue
    fi
  fi

  if (( changed == 1 )); then
    write_url_file
    sync_env_files
    log "📝 URL ditulis ke ${URL_FILE}; env files di-update."
    log "   Web: ${WEB_URL}"
    log "   API: ${API_URL}"
    log "   ⚠️  Restart dev server (npm run dev) supaya env baru ke-load."
  fi

  sleep "$CHECK_INTERVAL"

  # Health-check web.
  check_url_alive "$WEB_URL" "$WEB_PORT" "$WEB_HEALTH_PATH"; rc=$?
  if [[ $rc -eq 0 ]]; then
    WEB_FAIL=0
  elif [[ $rc -eq 1 ]]; then
    WEB_FAIL=$((WEB_FAIL + 1))
    log "web health-check gagal beruntun: ${WEB_FAIL}/${FAILURE_THRESHOLD}"
    if (( WEB_FAIL >= FAILURE_THRESHOLD )); then
      log "🔄 Restart tunnel web..."
      notify_macos "Tokopudidi" "Tunnel web mati — generate URL baru..."
      stop_tunnel_web
      WEB_FAIL=0
    fi
  fi

  # Health-check api.
  check_url_alive "$API_URL" "$API_PORT" "$API_HEALTH_PATH"; rc=$?
  if [[ $rc -eq 0 ]]; then
    API_FAIL=0
  elif [[ $rc -eq 1 ]]; then
    API_FAIL=$((API_FAIL + 1))
    log "api health-check gagal beruntun: ${API_FAIL}/${FAILURE_THRESHOLD}"
    if (( API_FAIL >= FAILURE_THRESHOLD )); then
      log "🔄 Restart tunnel api..."
      notify_macos "Tokopudidi" "Tunnel api mati — generate URL baru..."
      stop_tunnel_api
      API_FAIL=0
    fi
  fi
done
