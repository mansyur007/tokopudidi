#!/usr/bin/env bash
#
# OPS-10 — cek ketersediaan produksi dari luar (bukan dari dalam VPS).
#
# Kenapa script, bukan langsung `run: curl` di workflow: supaya logikanya bisa
# dijalankan dan DIUJI di mesin mana pun (termasuk terhadap host yang sengaja
# salah), bukan cuma terbukti saat produksi kebetulan mati.
#
# Bedanya dengan smoke-test deploy (OPS-3): smoke-test itu jalan sekali, dari
# DALAM VPS, dengan `--resolve` ke 127.0.0.1 — jadi ia melewati DNS publik dan
# jaringan luar. Yang ini jalan berkala dari GitHub Actions lewat internet, jadi
# ia juga menangkap kelas kegagalan yang tak terlihat dari dalam box: DNS,
# sertifikat kedaluwarsa, dan Caddy yang tidak bisa dijangkau dari luar.
#
# Exit code: 0 semua sehat · 1 ada probe gagal · 2 salah pakai.
#
# Env (semua opsional):
#   UPTIME_HOST            host yang dicek            (default: toko.emha.space)
#   UPTIME_ATTEMPTS        percobaan per probe        (default: 3)
#   UPTIME_RETRY_DELAY     jeda antar percobaan, detik (default: 20)
#   UPTIME_CERT_MIN_DAYS   ambang sisa umur sertifikat (default: 7; 0 = lewati)
#   UPTIME_TIMEOUT         batas waktu per request     (default: 15)

set -uo pipefail

HOST="${UPTIME_HOST:-toko.emha.space}"
ATTEMPTS="${UPTIME_ATTEMPTS:-3}"
RETRY_DELAY="${UPTIME_RETRY_DELAY:-20}"
CERT_MIN_DAYS="${UPTIME_CERT_MIN_DAYS:-7}"
TIMEOUT="${UPTIME_TIMEOUT:-15}"

if [ -z "$HOST" ]; then
  echo "UPTIME_HOST kosong." >&2
  exit 2
fi

failures=()

# probe <label> <path> <penanda-wajib-di-body>
#
# Gagal sekali TIDAK dianggap insiden. Monitor yang memekik pada satu paket
# hilang akan cepat diabaikan, dan monitor yang diabaikan sama saja dengan tidak
# ada. Baru dilaporkan setelah $ATTEMPTS percobaan berturut-turut gagal.
probe() {
  local label="$1" path="$2" marker="$3"
  local url="https://${HOST}${path}"
  local attempt body code reason err
  # Body dan stderr ditampung terpisah, bukan digabung lewat 2>&1: kalau
  # keduanya bercampur, urutan barisnya tidak dijamin dan pesan curl yang
  # menjelaskan KENAPA mati justru yang hilang. "Tidak ada respons" tanpa
  # sebab tidak menolong siapa pun yang dibangunkan notifikasinya.
  local body_file err_file
  body_file="$(mktemp)"; err_file="$(mktemp)"

  for attempt in $(seq 1 "$ATTEMPTS"); do
    code="$(curl -sS --max-time "$TIMEOUT" -o "$body_file" -w '%{http_code}' "$url" 2>"$err_file")"
    body="$(cat "$body_file")"
    err="$(tr '\n' ' ' < "$err_file" | cut -c1-200)"

    if [ "$code" != "200" ]; then
      # curl menulis 000 kalau gagal sebelum dapat respons sama sekali:
      # DNS tidak resolve, handshake TLS gagal, atau koneksi ditolak.
      case "$code" in
        ''|000|*[!0-9]*) reason="tidak ada respons HTTP — ${err:-curl gagal tanpa pesan}" ;;
        *)               reason="HTTP $code (harusnya 200)" ;;
      esac
    elif [ -n "$marker" ] && ! printf '%s' "$body" | grep -qF -- "$marker"; then
      # 200 belum tentu sehat: Caddy bisa menyajikan halaman lain, dan Next bisa
      # membalas 200 untuk halaman yang isinya bukan aplikasi kita.
      reason="HTTP 200 tapi body tidak memuat penanda '${marker}'"
    else
      echo "  ✓ ${label} — HTTP 200, penanda cocok (percobaan ke-${attempt})"
      rm -f "$body_file" "$err_file"
      return 0
    fi

    echo "  · ${label} percobaan ${attempt}/${ATTEMPTS} gagal: ${reason}"
    [ "$attempt" -lt "$ATTEMPTS" ] && sleep "$RETRY_DELAY"
  done

  echo "  ✗ ${label} — ${reason}"
  failures+=("${label}: ${reason}")
  rm -f "$body_file" "$err_file"
  return 1
}

# Sertifikat: Caddy memperbarui otomatis di sisa ~30 hari. Kalau sisanya sudah di
# bawah ambang, perpanjangannya sedang gagal diam-diam — dan itu berakhir jadi
# outage total yang terlihat sebagai peringatan keamanan di browser pengguna.
check_cert() {
  [ "$CERT_MIN_DAYS" -le 0 ] && { echo "  · sertifikat — dilewati"; return 0; }

  local end_date end_epoch now_epoch days
  end_date="$(echo | openssl s_client -servername "$HOST" -connect "${HOST}:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"

  if [ -z "$end_date" ]; then
    echo "  ✗ sertifikat — tidak bisa dibaca"
    failures+=("sertifikat: tidak bisa dibaca dari ${HOST}:443")
    return 1
  fi

  end_epoch="$(date -d "$end_date" +%s 2>/dev/null)"
  now_epoch="$(date +%s)"
  if [ -z "$end_epoch" ]; then
    echo "  · sertifikat — kedaluwarsa '${end_date}' tidak bisa di-parse, dilewati"
    return 0
  fi

  days=$(( (end_epoch - now_epoch) / 86400 ))
  if [ "$days" -lt "$CERT_MIN_DAYS" ]; then
    echo "  ✗ sertifikat — sisa ${days} hari (ambang ${CERT_MIN_DAYS})"
    failures+=("sertifikat: sisa ${days} hari, di bawah ambang ${CERT_MIN_DAYS} — perpanjangan Caddy kemungkinan gagal")
    return 1
  fi

  echo "  ✓ sertifikat — sisa ${days} hari"
}

echo "Cek ketersediaan https://${HOST} (${ATTEMPTS}× per probe, jeda ${RETRY_DELAY}s)"

# /api/health membalas 503 kalau `SELECT 1` ke Postgres gagal, jadi probe ini
# sekaligus mencakup database — bukan cuma "proses api hidup".
probe "api + database" "/api/health" '"database":"ok"'
probe "web (homepage)" "/" 'Tokopudidi'
check_cert

if [ ${#failures[@]} -gt 0 ]; then
  echo ""
  echo "GAGAL — ${#failures[@]} masalah di https://${HOST}:"
  for f in "${failures[@]}"; do echo "  - $f"; done
  exit 1
fi

echo ""
echo "OK — https://${HOST} sehat."
